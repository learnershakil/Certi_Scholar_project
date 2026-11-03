from app.providers.base import BaseOcrProvider
from app.providers.tesseract_provider import TesseractOcrProvider
from app.providers.mock_provider import MockOcrProvider

def get_ocr_provider(provider_name: str) -> BaseOcrProvider:
    name = provider_name.lower()
    if name in ("mock", "test"):
        return MockOcrProvider()
    else:
        # Default to local Tesseract
        return TesseractOcrProvider()

