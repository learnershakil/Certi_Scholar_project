import os
from pydantic import BaseModel

class OcrServiceConfig(BaseModel):
    service_key: str = os.getenv("OCR_SERVICE_KEY", "dev-internal-ocr-service-secret-token-32-chars")
    provider: str = os.getenv("OCR_PROVIDER", "tesseract").lower()  # 'tesseract' | 'mock' | 'documentai'
    documentai_project: str | None = os.getenv("GOOGLE_CLOUD_PROJECT")
    documentai_location: str | None = os.getenv("DOCUMENT_AI_LOCATION")
    documentai_processor_id: str | None = os.getenv("DOCUMENT_AI_PROCESSOR_ID")
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8000"))
    tesseract_cmd: str | None = os.getenv("TESSERACT_CMD", "/usr/bin/tesseract")

config = OcrServiceConfig()

