import boto3
import os
from fastapi import HTTPException
from app.utils.logger import logger
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)
BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

async def upload_video(file, user_id: str) -> str:
    try:
        file_name = f"interviews/{user_id}_{datetime.now().isoformat()}.mp4"
        s3_client.upload_fileobj(file, BUCKET_NAME, file_name, ExtraArgs={'ACL': 'public-read'})
        video_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{file_name}"
        logger.info(f"Video uploaded to S3: {video_url}")
        return video_url
    except Exception as e:
        logger.error(f"S3 upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload video")