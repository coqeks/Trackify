from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, BackgroundTasks
from typing import Annotated

from app import utils, cloud
from app.worker.tasks import separate
from app.deps import get_current_user
from celery import Celery

import uuid
from pathlib import Path


router = APIRouter(prefix="/audio", tags=["audio"])


@router.get("/upload")
async def read_audio(current_user=Depends(get_current_user)):
    print(current_user)
    unique_id = uuid.uuid4()
    return cloud.generate_upload_url(str(unique_id))

@router.post("/")
async def queue_process(target: Annotated[str, Form()], s3_key: Annotated[str, Form()], backgroundTask: BackgroundTasks = None):
    result = separate.delay(s3_key, target)
    return {"Status": "Task Queued?"}