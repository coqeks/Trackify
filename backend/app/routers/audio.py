from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, BackgroundTasks
from typing import Annotated

from app import crud, cloud, schemas
from app.worker.tasks import separate, app
from app.worker.cancel import request_cancel, is_cancelled
from app.deps import get_current_user, get_db
from celery.result import AsyncResult

import uuid
from pathlib import Path


router = APIRouter(
    prefix="/audio", 
    tags=["audio"],
    dependencies=[Depends(get_current_user)]
)


# Demucs writes 44.1kHz 16-bit stereo WAV, so the result size is predictable from duration
RESULT_BYTES_PER_SECOND = 44100 * 2 * 2
# Fallback when duration is unknown: a compressed ~128kbps file expands roughly 11x as WAV
FALLBACK_EXPANSION = 12


def storage_full(err: cloud.StorageFullError) -> HTTPException:
    return HTTPException(status_code=507, detail=str(err))


@router.post("/upload")
def read_audio(track_in: schemas.TrackIn):
    """Issue a signed upload URL, refusing up front if the upload plus its
    processed result wouldn't fit in remote storage."""
    if track_in.duration_seconds:
        estimated_result = int(track_in.duration_seconds * RESULT_BYTES_PER_SECOND)
    else:
        estimated_result = track_in.file_size * FALLBACK_EXPANSION

    try:
        cloud.ensure_capacity(track_in.file_size + estimated_result)
    except cloud.StorageFullError as err:
        raise storage_full(err)

    unique_id = uuid.uuid4()
    key = f"uploads/raw/{unique_id}"
    return cloud.generate_signed_url(key, 'put', content_length=track_in.file_size)

@router.post("/")
def queue_process(payload: schemas.SeparationDetail):
    target = payload.target
    s3_key = payload.s3_key
    print("Targets: ", target )
    print("Processing audio: ", s3_key)
    result = separate.delay(s3_key, target)
    return {"Status": "Task Queued", "Key": s3_key, "Task_ID": result.id}

@router.get("/{task_id}")
def read_process(task_id, background_task: BackgroundTasks):
    
    result = AsyncResult(task_id, app=app)
    print(f"Status for {task_id}: {result.status}")

    if result.state == "CANCELLED":
        return {"Status": result.state}
    if is_cancelled(task_id):
        return {"Status": 'CANCELLING'}

    if result.state == "SUCCESS":
        task_result = result.result
        url = cloud.generate_signed_url(task_result["s3_key"], 'get')["signed_url"]
        return {
            "Status": "SUCCESS",
            "s3_key": task_result["s3_key"],
            "result_url": url,
            "musical_key": task_result.get("musical_key"),
            "bpm": task_result.get("bpm"),
        }

    if result.state == "FAILURE":
        # Only surface messages meant for users; other errors may contain internals
        if type(result.result).__name__ == "StorageFullError":
            return {"Status": "FAILURE", "Detail": str(result.result)}
        return {"Status": "FAILURE", "Detail": "Processing failed. Please try again."}

    return {"Status": result.state}

@router.post("/save")
def save_track(
    track_in: schemas.TrackCreate,  
    session=Depends(get_db),
    current_user=Depends(get_current_user)
):
    if not track_in.cloud_key.startswith("uploads/processed/"):
        raise HTTPException(400, "Invalid track key.")

    obj = cloud.head_object(track_in.cloud_key)
    if obj is None:
        raise HTTPException(404, "Processed track not found. It may have expired.")

    # The result is already stored, so saving adds no bytes; refuse if we're over the cap
    try:
        cloud.ensure_capacity()
    except cloud.StorageFullError as err:
        raise storage_full(err)

    metadata = obj.get("Metadata", {})
    bpm = metadata.get("bpm")
    track = crud.save_track(
        session,
        track_in,
        current_user,
        musical_key=metadata.get("musical-key"),
        bpm=float(bpm) if bpm else None,
        size_bytes=obj.get("ContentLength"),
    )
    if not track:
        raise HTTPException(409, "Track already saved.")
    return {"Response": "Track saved", "Track": schemas.TrackOut.model_validate(track)}

@router.delete("/{task_id}")
def cancel_process(task_id):
    result = AsyncResult(task_id, app=app)
    if result.state == "PENDING":
        result.revoke()
    else:
        request_cancel(task_id)

    return {"Response": "Proc cancel requested"}