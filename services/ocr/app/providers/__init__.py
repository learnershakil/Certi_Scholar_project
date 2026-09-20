from app.providers.base import BaseOcrProvider
from app.providers.tesseract_provider import TesseractOcrProvider
from app.providers.google_vision_provider import GoogleVisionOcrProvider
from app.providers.mock_provider import MockOcrProvider

def get_ocr_provider(provider_name: str) -> BaseOcrProvider:
    name = provider_name.lower()
    if name in ("tesseract", "pytesseract"):
        return TesseractOcrProvider()
    elif name in ("google_cloud_vision", "gcp", "vision"):
        return GoogleVisionOcrProvider()
    elif name in ("mock", "test"):
        return MockOcrProvider()
    else:
        # Default fallback to Tesseract
        return TesseractOcrProvider()
