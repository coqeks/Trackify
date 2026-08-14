import boto3
from fastapi import UploadFile
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
    region_name="auto",  # R2 uses 'auto' for region
)

def cloud_upload(audio_file: UploadFile, audio_key: str):
    print("sommething")
    try:
        s3_client.upload_fileobj(
            Fileobj = audio_file,
            Bucket = BUCKET_NAME,
            Key = audio_key,
            ExtraArgs={"ContentType": audio_file.content_type}
        )
    except:
        print("[Cloud Upload] Something went wrong")
    
