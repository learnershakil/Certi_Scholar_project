import time
from datetime import datetime, timezone
from app.providers.base import BaseOcrProvider
from app.models import (
    NormalizedOcrResult,
    NormalizedPage,
    NormalizedBlock,
    NormalizedParagraph,
    NormalizedWord,
    BoundingPolygon,
    BoundingPoint,
)

class MockOcrProvider(BaseOcrProvider):
    @property
    def name(self) -> str:
        return "MOCK"

    @property
    def version(self) -> str:
        return "mock-deterministic-v1"

    async def extract(self, document_id: str, file_bytes: bytes, mime_type: str) -> NormalizedOcrResult:
        start_time = time.perf_counter()
        
        # Deterministic sample marksheet extraction
        words = [
            NormalizedWord(
                text="CENTRAL",
                confidence=0.99,
                boundingPolygon=BoundingPolygon(
                    vertices=[
                        BoundingPoint(x=50.0, y=50.0),
                        BoundingPoint(x=120.0, y=50.0),
                        BoundingPoint(x=120.0, y=65.0),
                        BoundingPoint(x=50.0, y=65.0),
                    ]
                ),
            ),
            NormalizedWord(
                text="BOARD",
                confidence=0.99,
                boundingPolygon=BoundingPolygon(
                    vertices=[
                        BoundingPoint(x=125.0, y=50.0),
                        BoundingPoint(x=180.0, y=50.0),
                        BoundingPoint(x=180.0, y=65.0),
                        BoundingPoint(x=125.0, y=65.0),
                    ]
                ),
            ),
            NormalizedWord(
                text="OF",
                confidence=0.99,
                boundingPolygon=BoundingPolygon(
                    vertices=[
                        BoundingPoint(x=185.0, y=50.0),
                        BoundingPoint(x=205.0, y=50.0),
                        BoundingPoint(x=205.0, y=65.0),
                        BoundingPoint(x=185.0, y=65.0),
                    ]
                ),
            ),
            NormalizedWord(
                text="SECONDARY",
                confidence=0.99,
                boundingPolygon=BoundingPolygon(
                    vertices=[
                        BoundingPoint(x=210.0, y=50.0),
                        BoundingPoint(x=310.0, y=50.0),
                        BoundingPoint(x=310.0, y=65.0),
                        BoundingPoint(x=210.0, y=65.0),
                    ]
                ),
            ),
            NormalizedWord(
                text="EDUCATION",
                confidence=0.99,
                boundingPolygon=BoundingPolygon(
                    vertices=[
                        BoundingPoint(x=315.0, y=50.0),
                        BoundingPoint(x=415.0, y=50.0),
                        BoundingPoint(x=415.0, y=65.0),
                        BoundingPoint(x=315.0, y=65.0),
                    ]
                ),
            ),
        ]

        p = NormalizedParagraph(text="CENTRAL BOARD OF SECONDARY EDUCATION", words=words)
        b = NormalizedBlock(blockType="TEXT", text="CENTRAL BOARD OF SECONDARY EDUCATION", paragraphs=[p])
        page = NormalizedPage(
            pageNumber=1,
            width=800.0,
            height=1100.0,
            unit="PIXEL",
            confidence=0.99,
            text="CENTRAL BOARD OF SECONDARY EDUCATION\nROLL NO: 129481\nNAME: AARAV SHARMA\nMARKS: 450/500",
            blocks=[b],
        )

        latency_ms = int((time.perf_counter() - start_time) * 1000)

        return NormalizedOcrResult(
            provider="MOCK",
            providerVersion=self.version,
            documentId=document_id,
            fullText=page.text,
            pages=[page],
            pageCount=1,
            processedAt=datetime.now(timezone.utc).isoformat(),
            latencyMs=max(1, latency_ms),
        )
