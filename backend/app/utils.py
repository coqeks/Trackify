import asyncio
import shutil
import tempfile
import time
import uuid
from pydub import AudioSegment
from pathlib import Path

from fastapi import HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse


ALLOWED_TYPES = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm", "audio/flac"}
DEMUCS_MODEL = "htdemucs_6s"

# ---- Capacity controls ----
TEMP_ROOT = Path(tempfile.gettempdir())
MIN_FREE_BYTES = 2 * 1024 * 1024 * 1024   # refuse new work below 2GB free
MAX_CONCURRENT_JOBS = 3                    # cap simultaneous Demucs runs
MAX_QUEUE_WAIT_SECONDS = 120                # give up and 503 if waiting too long
DISK_POLL_INTERVAL = 2.0

job_semaphore = asyncio.Semaphore(MAX_CONCURRENT_JOBS)

def _free_bytes() -> int:
    return shutil.disk_usage(TEMP_ROOT).free


async def _wait_for_capacity():
    """Block until both disk space and a concurrency slot are available,
    or raise 503 if we wait too long."""
    start = time.monotonic()
    while _free_bytes() < MIN_FREE_BYTES:
        if time.monotonic() - start > MAX_QUEUE_WAIT_SECONDS:
            raise HTTPException(
                status_code=503,
                detail="Server is at storage capacity. Please try again shortly.",
            )
        await asyncio.sleep(DISK_POLL_INTERVAL)


def _cleanup(path: Path) -> None:
    shutil.rmtree(path, ignore_errors=True)

# [1, 2, 3, 4, 5, 6] Add [0] and [1], append result to end of list and remove 
# [3, 4, 5, 6, 3] -> [5, 6, 3, 7] -> [3, 7, 11] -> [11, 10] -> [21]
#Example: ["guitar.wav", "vocal.wav", "piano.wav", "drums.wav"]
def combine_stems(filePaths: list):
    base_audio = AudioSegment.from_file(filePaths[0])
    if len(filePaths) > 1:
        for path in filePaths[1:]:
            next_audio = AudioSegment.from_file(path)
            base_audio = base_audio.overlay(next_audio, position=0)
    return base_audio.export("result.wav", format="wav")


async def separate_stem(file: UploadFile, targets, background_tasks: BackgroundTasks = None):
    print(TEMP_ROOT)

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid file type '{file.content_type}'.")

    # 1. Admission control: don't even read the upload into memory/disk if we're tight on space
    await _wait_for_capacity()

    work_dir = Path(tempfile.mkdtemp(prefix="demucs_"))
    input_path = work_dir / f"input_{uuid.uuid4().hex}{Path(file.filename or '').suffix or '.audio'}"
    output_dir = work_dir / "separated"

    try:
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # Double-check after reading (large uploads can eat the margin we checked earlier)
        if _free_bytes() - len(contents) < MIN_FREE_BYTES // 2:
            raise HTTPException(status_code=503, detail="Server is at storage capacity. Please try again shortly.")

        input_path.write_bytes(contents)

        # 2. Concurrency control: only MAX_CONCURRENT_JOBS Demucs processes run at once;
        #    others wait here (this is your "queue")
        async with job_semaphore:
            print("Demucs initiating, target: ", targets)
            cmd = [
                "python", "-m", "demucs",
                "-n", DEMUCS_MODEL,
                "--two-stems", targets,
                "-o", str(output_dir),
                str(input_path),
            ]
            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                raise HTTPException(
                    status_code=500,
                    detail=f"Demucs processing failed: {stderr.decode(errors='ignore')[-1000:]}",
                )

        track_stem = input_path.stem
        result_path = output_dir / DEMUCS_MODEL / track_stem 
        result_singlepath = result_path / f"{targets}.wav"

        result_files = [f for f in result_path.iterdir() if f.is_file()]
        print(result_files)

        if not result_path.exists():
            raise HTTPException(status_code=500, detail="Backing track files not found after processing.")

        background_tasks.add_task(_cleanup, work_dir)
        print("Completed")
        return FileResponse(path=result_path, media_type="audio/wav", filename=f"{track_stem}_backing_track.wav")

    except HTTPException:
        _cleanup(work_dir)
        raise
    except Exception as e:
        _cleanup(work_dir)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}") from e

