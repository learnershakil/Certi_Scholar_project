import time
from datetime import datetime, timezone

from app.config import config
from app.models import (
    BoundingPoint,
    BoundingPolygon,
    NormalizedBlock,
    NormalizedOcrResult,
    NormalizedPage,
    NormalizedParagraph,
    NormalizedWord,
)
from app.providers.base import BaseOcrProvider


def _anchor_text(document_text: str, layout) -> str:
    try:
        segments = layout.text_anchor.text_segments
        if not segments:
            return ""
        seg = segments[0]
        start = int(seg.start_index) if seg.start_index else 0
        end = int(seg.end_index) if seg.end_index else len(document_text)
        return document_text[start:end]
    except Exception:
        return ""


def _polygon(layout, width: float, height: float):
    try:
        poly = layout.bounding_poly
        vertices = []
        if getattr(poly, "normalized_vertices", None):
            for v in poly.normalized_vertices:
                vertices.append(BoundingPoint(x=float(v.x) * width, y=float(v.y) * height))
        elif getattr(poly, "vertices", None):
            for v in poly.vertices:
                vertices.append(BoundingPoint(x=float(v.x), y=float(v.y)))
        if len(vertices) < 4:
            return None
        return BoundingPolygon(vertices=vertices[:4])
    except Exception:
        return None


def documentai_response_to_normalized(response, document_id: str, latency_ms: int) -> NormalizedOcrResult:
    doc = response.document
    full_text = doc.text or ""
    pages: list[NormalizedPage] = []
    for page in doc.pages:
        width = float(page.dimension.width) if page.dimension and page.dimension.width else 0.0
        height = float(page.dimension.height) if page.dimension and page.dimension.height else 0.0
        paragraphs: list[NormalizedParagraph] = []
        for para in page.paragraphs:
            words: list[NormalizedWord] = []
            for word in para.words:
                words.append(
                    NormalizedWord(
                        text=_anchor_text(full_text, word.layout),
                        confidence=float(word.layout.confidence) if word.layout and word.layout.confidence is not None else None,
                        boundingPolygon=_polygon(word.layout, width, height),
                    )
                )
            paragraphs.append(
                NormalizedParagraph(
                    text=_anchor_text(full_text, para.layout),
                    confidence=float(para.layout.confidence) if para.layout and para.layout.confidence is not None else None,
                    boundingPolygon=_polygon(para.layout, width, height),
                    words=words,
                )
            )
        page_text = "\n".join(p.text for p in paragraphs)
        pages.append(
            NormalizedPage(
                pageNumber=int(page.page_number),
                width=width,
                height=height,
                unit="PIXEL",
                text=page_text,
                blocks=[
                    NormalizedBlock(
                        blockType="TEXT",
                        text=page_text,
                        paragraphs=paragraphs,
                    )
                ],
            )
        )
    return NormalizedOcrResult(
        provider="DOCUMENT_AI",
        providerVersion="documentai-v1",
        documentId=document_id,
        fullText=full_text,
        pages=pages,
        pageCount=len(pages),
        processedAt=datetime.now(timezone.utc).isoformat(),
        latencyMs=latency_ms,
    )


class DocumentAiOcrProvider(BaseOcrProvider):
    def __init__(self):
        if not config.documentai_project or not config.documentai_location or not config.documentai_processor_id:
            raise RuntimeError(
                "Document AI is not configured. Set GOOGLE_CLOUD_PROJECT, "
                "DOCUMENT_AI_LOCATION and DOCUMENT_AI_PROCESSOR_ID, and point "
                "GOOGLE_APPLICATION_CREDENTIALS at a service-account key with "
                "the Document AI API User role."
            )

    @property
    def name(self) -> str:
        return "DOCUMENT_AI"

    @property
    def version(self) -> str:
        return "documentai-v1"

    async def extract(self, document_id: str, file_bytes: bytes, mime_type: str) -> NormalizedOcrResult:
        try:
            from google.cloud import documentai
        except ImportError as exc:
            raise RuntimeError(
                "google-cloud-documentai is not installed. Install it in the "
                "OCR service (pip install google-cloud-documentai) before "
                "selecting OCR_PROVIDER=documentai."
            ) from exc
        start = time.time()
        client = documentai.DocumentProcessorServiceClient()
        name = client.processor_path(
            config.documentai_project, config.documentai_location, config.documentai_processor_id
        )
        request = documentai.ProcessRequest(
            name=name,
            raw_document=documentai.RawDocument(content=file_bytes, mime_type=mime_type),
        )
        response = client.process_document(request=request)
        latency_ms = int((time.time() - start) * 1000)
        return documentai_response_to_normalized(response, document_id, latency_ms)
