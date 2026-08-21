from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, BackgroundTasks
from typing import Annotated

from app import utils, cloud
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
    return cloud.generate_upload_url(str(unique_id))

@router.post("/")
def queue_process(target: Annotated[list[str], Form()], s3_key: Annotated[str, Form()]):
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
        return {"Status": "SUCCESS", "s3_Key": result.result}
    
    return {"Status": result.state}

    # return {"Status": str(result.status)}    
