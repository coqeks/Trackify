from celery import Celery
from app.utils import separate_stem, _cleanup
from app import cloud

import asyncio
import uuid

from botocore.exceptions import ClientError

app = Celery("tasks", broker="redis://localhost:6379/0", backend="redis://localhost:6379/0")        

@app.task
def separate(s3_key, target):
    work_dir = None
    try:
        response = cloud.read_object(s3_key)
        raw_audio = response['Body']
        content_type = response['ContentType']

        result_path, work_dir = asyncio.run(
            separate_stem(
                body=raw_audio,
                content_type=content_type,
                filename=s3_key,
                target=target,
            )
        )

        key = f"uploads/processed/{uuid.uuid4().hex}.wav"
        cloud.upload_file(result_path, key)
        return key
    except ClientError as err:
        return err.response['Error']
    finally:
        if work_dir:
            _cleanup(work_dir)