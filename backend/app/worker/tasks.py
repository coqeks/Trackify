from celery import Celery, Task
from app.utils import separate_stem, _cleanup
from app import cloud

import asyncio
import uuid

from botocore.exceptions import ClientError

app = Celery("tasks", broker="redis://localhost:6379/0", backend="redis://localhost:6379/0")        

@app.task(bind=True)
def separate(self: Task, s3_key: str, target: list):
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