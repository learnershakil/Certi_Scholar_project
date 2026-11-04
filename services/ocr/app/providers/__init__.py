from app.providers.base import BaseOcrProvider
from app.providers.tesseract_provider import TesseractOcrProvider
from app.providers.mock_provider import MockOcrProvider
from app.providers.documentai_provider import DocumentAiOcrProvider

def get_ocr_provider(provider_name: str) -> BaseOcrProvider:
    name = provider_name.lower()
    if name in ("mock", "test"):
        return MockOcrProvider()
    if name in ("documentai", "document_ai", "google_document_ai"):
        return DocumentAiOcrProvider()
    # Default to local Tesseract
    return TesseractOcrProvider()

