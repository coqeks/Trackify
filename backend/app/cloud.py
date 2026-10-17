"""
@file:       cloud.py
@summary:    Wrapper functions for boto3 cloud communication methods
"""

import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
from fastapi import UploadFile, HTTPException
from dotenv import load_dotenv
import os
import time

load_dotenv()

ACCOUNT_ID = os.getenv("ACCOUNT_ID")
ACCESS_KEY_ID = os.getenv("ACCESS_KEY_ID")
SECRET_ACCESS_KEY = os.getenv("SECRET_ACCESS_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME")

ALLOWED_METHODS = ["get", "put"]

# Hard cap on total bucket usage. Decimal GB so we stay under a 10 GB quota either way.
MAX_STORAGE_BYTES = 10 * 1000 ** 3


class StorageFullError(Exception):
    """Raised when an operation would push the bucket past MAX_STORAGE_BYTES."""
    pass

# Connect to Cloudflare R2 using the S3 interface
s3_client = boto3.client(
    "s3",
    endpoint_url=f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=ACCESS_KEY_ID,
    aws_secret_access_key=SECRET_ACCESS_KEY,
    region_name="auto", 
    config=Config(
        s3={"addressing_style": "path"},
        request_checksum_calculation="when_required",
        response_checksum_validation="when_required",
    )
)

def upload_file(file_path, key, metadata: dict[str, str] | None = None, content_type: str | None = None):
    extra_args = {}
    if metadata:
        extra_args["Metadata"] = metadata
    if content_type:
        extra_args["ContentType"] = content_type
    try:
        s3_client.upload_file(
            file_path, BUCKET_NAME, key, ExtraArgs=extra_args or None
        )
    except ClientError as e:
        error_message = e.response["Error"]["Message"]
        raise HTTPException(status_code=500, detail=str(error_message))

def remove_object(key: str, delay = None):
    try:
        if delay != None:
            time.sleep(delay)
        response = s3_client.delete_object(
            Bucket = BUCKET_NAME,
            Key = key
        )
    except ClientError as e:
        error_message = e.response["Error"]["Message"]
        raise HTTPException(status_code=500, detail=str(error_message))

def read_object(key: str):
    try: 
        response = s3_client.get_object(
            Bucket = BUCKET_NAME,
            Key = key
        )
        return response
    except ClientError as e:
        error_message = e.response["Error"]["Message"]
        raise HTTPException(status_code=500, detail=str(error_message))

def head_object(key: str):
    """Return object size/metadata without downloading it, or None if it doesn't exist."""
    try:
        return s3_client.head_object(Bucket=BUCKET_NAME, Key=key)
    except ClientError as e:
        if e.response["Error"]["Code"] in ("404", "NoSuchKey", "NotFound"):
            return None
        raise HTTPException(status_code=500, detail=str(e.response["Error"]["Message"]))

def get_bucket_usage() -> int:
    """Total bytes currently stored in the bucket."""
    total = 0
    paginator = s3_client.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=BUCKET_NAME):
        total += sum(obj["Size"] for obj in page.get("Contents", []))
    return total

def ensure_capacity(incoming_bytes: int = 0):
    """Raise StorageFullError if adding incoming_bytes would exceed the storage cap."""
    used = get_bucket_usage()
    if used + incoming_bytes > MAX_STORAGE_BYTES:
        raise StorageFullError(
            "Storage is full. Not enough space to process or save this track right now; "
            "please try again later or delete some saved tracks."
        )

def generate_signed_url(s3_key: str, method: str, content_length: int | None = None):

    if method not in ALLOWED_METHODS:
        raise HTTPException(status_code=500, detail="500 Internal Server Error: Invalid Cloud Method")

    params = {'Bucket': BUCKET_NAME, 'Key': s3_key}
    # Signing the length stops a client uploading more than it declared for the capacity check
    if method == "put" and content_length is not None:
        params['ContentLength'] = content_length

    try:
        presigned_url = s3_client.generate_presigned_url(
            f'{method}_object',
            Params=params,
            ExpiresIn=300
        )
    except ClientError as e:
        error_message = e.response["Error"]["Message"]
        raise HTTPException(status_code=500, detail=str(error_message))
    
    return {
        "signed_url": presigned_url,
        "s3_key": s3_key
    }
