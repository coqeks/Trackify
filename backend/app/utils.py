import asyncio
import shutil
import tempfile
import time
import uuid
from pydub import AudioSegment
from pathlib import Path
from botocore.response import StreamingBody

import app.cloud

from fastapi import HTTPException, BackgroundTasks
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


def _read_streaming_body(body: StreamingBody) -> bytes:
    """Blocking read, meant to be run in a worker thread via asyncio.to_thread.
    Read chunks of audio file through loop and return the joined bytes."""
    chunks = []
    while True:
        chunk = body.read(1024 * 1024)  # 1MB at a time
        if not chunk:
            break
        chunks.append(chunk)
    return b"".join(chunks)


#Example: ["guitar.wav", "vocal.wav", "piano.wav", "drums.wav"]
def combine_stems(file_paths: list, output_path: Path):
    """Combines separated stem audio using pydub's overlay() method.
    Currently not used"""
    if not file_paths:
        raise ValueError("combine_stems requires at least one stem file path.")
 
    base_audio = AudioSegment.from_file(file_paths[0])
    for path in file_paths[1:]:
        next_audio = AudioSegment.from_file(path)
        base_audio = base_audio.overlay(next_audio, position=0)
 
    base_audio.export(output_path, format="wav")
    return output_path



async def separate_stem(
    body: StreamingBody,
    content_type: str,
    filename: str,
    target: list
):

    #Verify content_type is allowed
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid file type '{content_type}'.")

    #Block thread until enough free space
    await _wait_for_capacity()

    work_dir = Path(tempfile.mkdtemp(prefix="demucs_"))
    input_path = work_dir / f"input_{uuid.uuid4().hex}{Path(filename or '').suffix or '.audio'}"
    output_dir = work_dir / "separated"

    try:
    
        contents = await asyncio.to_thread(_read_streaming_body, body)
        if not contents:
            raise HTTPException(status_code=400, detail="Object from R2 is empty.")

        if _free_bytes() - len(contents) < MIN_FREE_BYTES // 2:
            raise HTTPException(status_code=503, detail="Server is at storage capacity. Please try again shortly.")

        input_path.write_bytes(contents)

        # Async block that runs demucs separation command, can be run maximum 3 times at the same time
        async with job_semaphore:
            print("Demucs initiating, target: ", target)
            cmd = [
                "python", "-m", "demucs",
                "-n", DEMUCS_MODEL,
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
        stem_dir = output_dir / DEMUCS_MODEL / track_stem

        stem_paths = []
        missing = []
        for stem_name in target:
            stem_path = stem_dir / f"{stem_name}.wav"
            if stem_path.exists():
                stem_paths.append(stem_path)
            else:
                missing.append(stem_name)
 
        if missing:
            raise HTTPException(
                status_code=500,
                detail=f"Backing track file(s) not found after processing: {', '.join(missing)}.",
            )
 
        result_path = stem_dir / f"combined_{'_'.join(target)}.wav"
        await asyncio.to_thread(combine_stems, stem_paths, result_path)

        if not result_path.exists():
            raise HTTPException(status_code=500, detail="Backing track files not found after processing.")
        
        print("Completed")
        return result_path, work_dir

    except HTTPException:
        _cleanup(work_dir)
        raise
    except Exception as e:
        _cleanup(work_dir)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}") from e