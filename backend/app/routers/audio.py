from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, BackgroundTasks
from typing import Annotated

from app import utils, cloud, schemas
from app.worker.tasks import separate, app
from app.deps import get_current_user
from celery import Celery
from celery.result import AsyncResult

import uuid
from pathlib import Path


router = APIRouter(prefix="/audio", tags=["audio"])


@router.get("/upload")
def read_audio(current_user=Depends(get_current_user)):
    print(current_user)
    unique_id = uuid.uuid4()
    key = f"uploads/raw/{unique_id}"
    return cloud.generate_signed_url(key, "put")

@router.post("/")
def queue_process(payload: schemas.SeparationDetail):
    target = payload.target
    s3_key = payload.s3_key
    print("Targets: ", target )
    print("Processing audio: ", s3_key)
    result = separate.delay(s3_key, target)
    return {"Status": "Task Queued", "Key": s3_key, "Task_ID": result.id}

@router.get("/{task_id}")
def read_process(task_id):
    
    result = AsyncResult(task_id, app=app)
    print(f"Status for {task_id}: {result.status}")

    if result.state == "SUCCESS":
        get = result.get() 
        url = cloud.generate_signed_url(result.result, 'get')["signed_url"]

        return {"Status": "SUCCESS", "s3_Key": result.result, "result_url": url}
    
    return {"Status": result.state}
