import os
from pydantic import BaseModel

class OcrServiceConfig(BaseModel):
    service_key: str = os.getenv("OCR_SERVICE_KEY", "dev-internal-ocr-service-secret-token-32-chars")
    provider: str = os.getenv("OCR_PROVIDER", "tesseract").lower()  # 'tesseract' | 'google_cloud_vision' | 'mock'
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8000"))
    google_creds_path: str | None = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    tesseract_cmd: str | None = os.getenv("TESSERACT_CMD", "/usr/bin/tesseract")

config = OcrServiceConfig()
