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

def upload_object(audio_file: UploadFile, audio_key: str):
    try:
        s3_client.upload_fileobj(
            Fileobj = audio_file,
            Bucket = BUCKET_NAME,
            Key = audio_key,
            ExtraArgs={"ContentType": audio_file.content_type}
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
    except:
        raise HTTPException(status_code=500, detail="reading error [cloud]")
    
def generate_upload_url(fileID: str):

    s3_key = f"uploads/raw/{fileID}"

    try:
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={'Bucket': BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=300
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    return {
        "upload_url": presigned_url,
        "s3_key": s3_key
    }