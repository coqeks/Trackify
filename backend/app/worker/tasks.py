"""
@file:       tasks.py
@summary:    Instructions for celery worker
"""

from celery import Celery, Task
from app.utils import separate_stem, _cleanup
from app import cloud

import asyncio
import uuid

from botocore.exceptions import ClientError

import os
from dotenv import load_dotenv
load_dotenv()

broker_url = str(os.getenv("BROKER_URL"))
app = Celery("tasks", broker=broker_url, backend=broker_url)        

@app.task(bind=True)
def separate(self: Task, s3_key: str, target: list):
    """""
    Reads raw bytes and content type of raw audio from cloud storage, 
    separates the audio, uploads the result and return its cloud key.

    Parameters:
        self (Task): The current task instance.
        s3_key (str): The location of the raw audio file in cloud storage.
        target (list[str]): Stems to keep in result audio.

    Returns:
        String: Key to the result audio in cloud storage.
    """""
    work_dir = None
    try:

        self.update_state(
            state='READING'
        )

        response = cloud.read_object(s3_key)
        raw_audio = response['Body']
        content_type = response['ContentType']

        cloud.remove_object(s3_key)

        self.update_state(
            state='COMPUTING'
        )

        result_path, work_dir = asyncio.run(
            separate_stem(
                body=raw_audio,
                content_type=content_type,
                filename=s3_key,
                target=target,
            )
        )

        self.update_state(
            state='UPLOADING'
        )

        audio_id = s3_key.split("/")[2]

        key = f"uploads/processed/result_{audio_id}"
        cloud.upload_file(result_path, key)
        return key
    except ClientError as err:
        return err.response['Error']
    finally:
        if work_dir:
            _cleanup(work_dir)
        