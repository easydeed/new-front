import os, uuid
from typing import Tuple
from ..deps import get_settings, get_logger
logger = get_logger()

try:
    import boto3
except Exception:
    boto3 = None

class StorageClient:
    def __init__(self):
        self.s = get_settings()
        if self.s.STORAGE_DRIVER == "s3" and not boto3:
            logger.warning("boto3 not installed, switching to local storage")
            self.s.STORAGE_DRIVER = "local"
        if self.s.STORAGE_DRIVER == "local":
            os.makedirs(self.s.LOCAL_STORAGE_DIR, exist_ok=True)
        if self.s.STORAGE_DRIVER == "s3":
            self.s3 = boto3.client(
                "s3",
                region_name=self.s.S3_REGION,
                aws_access_key_id=self.s.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=self.s.AWS_SECRET_ACCESS_KEY
            )

    def save_pdf(self, data: bytes, filename_hint: str) -> Tuple[str, str]:
        file_id = str(uuid.uuid4())
        fname = f"{file_id}_{filename_hint}".replace(" ", "_")
        if self.s.STORAGE_DRIVER == "local":
            path = os.path.join(self.s.LOCAL_STORAGE_DIR, fname)
            with open(path, "wb") as f:
                f.write(data)
            return f"/billing-files/{fname}", fname
        key = f"billing/invoices/{fname}"
        self.s3.put_object(Body=data, Bucket=self.s.S3_BUCKET, Key=key, ContentType="application/pdf")
        url = f"https://{self.s.S3_BUCKET}.s3.{self.s.S3_REGION}.amazonaws.com/{key}"
        return url, fname
