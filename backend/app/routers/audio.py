from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, BackgroundTasks
from typing import Annotated

from app import utils
from app.deps import get_current_user
from celery import Celery

import asyncio
import shutil
import tempfile
import time
import uuid
from pathlib import Path


router = APIRouter(prefix="/audio", tags=["audio"])



@router.post("/")
async def read_audio(file: Annotated[UploadFile, File()], target: Annotated[str, Form()], background_tasks: BackgroundTasks = None):
    return utils.separate_stem(file, target, background_tasks)