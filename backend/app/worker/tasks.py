"""
@file:       tasks.py
@summary:    Instructions for celery worker
"""

from celery import Celery, Task
from celery.exceptions import Ignore
from app.utils import separate_stem, _cleanup
from app.analysis import analyze_stems
from app import cloud
from app.worker.cancel import is_cancelled, clear_cancel, CancelException

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
    separates the audio, detects its key and BPM, uploads the result and returns its details.

    Parameters:
        self (Task): The current task instance.
        s3_key (str): The location of the raw audio file in cloud storage.
        target (list[str]): Stems to keep in result audio.

    Returns:
        Dict: s3_key of the result audio in cloud storage, plus detected musical_key and bpm.
    """""
    work_dir = None

    id = self.request.id

    if is_cancelled(id):
        self.update_state(
            state='CANCELLED'
        )
        return 

    try:

        self.update_state(
            state='READING' if not is_cancelled(id) else 'CANCELLING'
        )

        response = cloud.read_object(s3_key)
        raw_audio = response['Body']
        content_type = response['ContentType']

        cloud.remove_object(s3_key)

        self.update_state(
            state='COMPUTING' if not is_cancelled(id) else 'CANCELLING'
        )

        result_path, work_dir = asyncio.run(
            separate_stem(
                body=raw_audio,
                content_type=content_type,
                filename=s3_key,
                target=target,
                task_id=self.request.id
            )
        )

        self.update_state(
            state='ANALYZING' if not is_cancelled(id) else 'CANCELLING'
        )

        # Analysis is a bonus, never fail the whole job because of it
        try:
            analysis = analyze_stems(result_path.parent)
        except Exception as err:
            print("Key/BPM analysis failed: ", err)
            analysis = {"musical_key": None, "bpm": None}
        print("Analysis: ", analysis)

        self.update_state(
            state='UPLOADING' if not is_cancelled(id) else 'CANCELLING'
        )

        # Final, exact capacity check now that the result size is known
        cloud.ensure_capacity(result_path.stat().st_size)

        audio_id = s3_key.split("/")[2]

        key = f"uploads/processed/result_{audio_id}"
        # Store analysis alongside the object so saving can read it server-side.
        # Hyphenated names: metadata travels as x-amz-meta-* headers, where underscores get dropped.
        metadata = {}
        if analysis["musical_key"]:
            metadata["musical-key"] = analysis["musical_key"]
        if analysis["bpm"]:
            metadata["bpm"] = str(analysis["bpm"])
        cloud.upload_file(result_path, key, metadata=metadata, content_type="audio/wav")
        return {"s3_key": key, **analysis}
    except ClientError as err:
        raise RuntimeError(err.response['Error'].get('Message', 'Cloud storage error'))
    except CancelException:
        print("Cancelled Task")
        self.update_state(
            state='CANCELLED'
        )
        raise Ignore()
    finally:
        clear_cancel(self.request.id)
        if work_dir:
            _cleanup(work_dir)
        