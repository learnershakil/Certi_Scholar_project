import os
import time
from datetime import datetime, timezone
from app.providers.base import BaseOcrProvider
from app.models import NormalizedOcrResult

class GoogleVisionOcrProvider(BaseOcrProvider):
    def __init__(self, credentials_path: str | None = None):
        self.credentials_path = credentials_path or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        self.is_configured = bool(self.credentials_path and os.path.exists(self.credentials_path))

    @property
    def name(self) -> str:
        return "GOOGLE_CLOUD_VISION"

    @property
    def version(self) -> str:
        return "v1-documentTextDetection"

    async def extract(self, document_id: str, file_bytes: bytes, mime_type: str) -> NormalizedOcrResult:
        if not self.is_configured:
            raise RuntimeError(
                "Google Cloud Vision provider is NOT_CONFIGURED. "
                "Set GOOGLE_APPLICATION_CREDENTIALS to a valid service account JSON file."
            )

        try:
            from google.cloud import vision_v1
            client = vision_v1.ImageAnnotatorClient()
            image = vision_v1.Image(content=file_bytes)

            start_time = time.perf_counter()
            response = client.document_text_detection(image=image)

            if response.error.message:
                raise RuntimeError(f"Google Cloud Vision API error: {response.error.message}")

            full_text = response.full_text_annotation.text if response.full_text_annotation else ""
            pages = []

            if response.full_text_annotation and response.full_text_annotation.pages:
                for idx, page in enumerate(response.full_text_annotation.pages):
                    words = []
                    for block in page.blocks:
                        for paragraph in block.paragraphs:
                            for word in paragraph.words:
                                word_text = "".join([symbol.text for symbol in word.symbols])
                                vertices = [
                                    {"x": vertex.x, "y": vertex.y}
                                    for vertex in word.bounding_box.vertices
                                ]
                                words.append({
                                    "text": word_text,
                                    "confidence": getattr(word, "confidence", 0.95),
                                    "boundingBox": vertices,
                                })
                    pages.append({
                        "pageNumber": idx + 1,
                        "text": full_text,
                        "words": words,
                    })

            latency_ms = int((time.perf_counter() - start_time) * 1000)
            return NormalizedOcrResult(
                provider="GOOGLE_CLOUD_VISION",
                providerVersion=self.version,
                documentId=document_id,
                fullText=full_text,
                pages=pages,
                pageCount=len(pages) if pages else (1 if full_text else 0),
                processedAt=datetime.now(timezone.utc).isoformat(),
                latencyMs=latency_ms,
            )
        except ImportError:
            raise RuntimeError(
                "Google Cloud Vision provider requires 'google-cloud-vision' package. "
                "Install with: pip install google-cloud-vision"
            )

