from typing import Literal
from pydantic import BaseModel, Field

class BoundingPoint(BaseModel):
    x: float
    y: float

class BoundingPolygon(BaseModel):
    vertices: list[BoundingPoint]

class NormalizedWord(BaseModel):
    text: str
    confidence: float | None = None
    boundingPolygon: BoundingPolygon | None = None

class NormalizedParagraph(BaseModel):
    text: str
    confidence: float | None = None
    boundingPolygon: BoundingPolygon | None = None
    words: list[NormalizedWord] = Field(default_factory=list)

class NormalizedBlock(BaseModel):
    blockType: Literal['TEXT', 'TABLE', 'PICTURE', 'RULER', 'UNKNOWN'] = 'TEXT'
    text: str
    confidence: float | None = None
    boundingPolygon: BoundingPolygon | None = None
    paragraphs: list[NormalizedParagraph] = Field(default_factory=list)

class NormalizedPage(BaseModel):
    pageNumber: int
    width: float
    height: float
    unit: Literal['PIXEL', 'POINT'] = 'PIXEL'
    confidence: float | None = None
    text: str
    blocks: list[NormalizedBlock] = Field(default_factory=list)

class NormalizedOcrResult(BaseModel):
    provider: Literal['GOOGLE_CLOUD_VISION', 'TESSERACT', 'MOCK']
    providerVersion: str | None = None
    documentId: str
    fullText: str
    pages: list[NormalizedPage] = Field(default_factory=list)
    pageCount: int
    processedAt: str
    latencyMs: int

class OcrProcessRequest(BaseModel):
    documentId: str
    mimeType: str
    fileBase64: str | None = None
    storageKey: str | None = None

