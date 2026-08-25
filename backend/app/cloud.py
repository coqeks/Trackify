import boto3
from botocore.exceptions import ClientError
from botocore.config import Config
from fastapi import UploadFile, HTTPException
from dotenv import load_dotenv
import os

load_dotenv()

ACCOUNT_ID = os.getenv("ACCOUNT_ID")
ACCESS_KEY_ID = os.getenv("ACCESS_KEY_ID")
SECRET_ACCESS_KEY = os.getenv("SECRET_ACCESS_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME")

ALLOWED_METHODS = ["get", "put"]

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

def upload_file(file_path, key):
    try:
        s3_client.upload_file(
            file_path, BUCKET_NAME, key
        )
    except:
        print("[Cloud Upload] Something went wrong")

def remove_object(key: str):
    try:
        response = s3_client.delete_object(
            Bucket = BUCKET_NAME,
            Key = key
        )
    except:
        print("[Cloud] Something went wrong: ", response)

def read_object(key: str):
    try: 
        response = s3_client.get_object(
            Bucket = BUCKET_NAME,
            Key = key
        )
        return response
    except ClientError as error:
        print(error.response['Error']['Code'])
        print(error.response['Error']['Message'])
        raise error
    
def generate_signed_url(s3_key: str, method: str):

    if method not in ALLOWED_METHODS:
        raise HTTPException(status_code=500, detail="500 Internal Server Error: Invalid Cloud Method")

    try:
        presigned_url = s3_client.generate_presigned_url(
            f'{method}_object',
            Params={'Bucket': BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=300
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    return {
        "signed_url": presigned_url,
        "s3_key": s3_key
    }

