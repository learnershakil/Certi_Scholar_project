# CertiScholar Python OCR Microservice (M2)

> **Purpose:** Asynchronous, isolated optical character recognition service for student academic and verification documents.  
> **Providers:** Tesseract 5.x (self-hosted / offline) and Google Cloud Vision (`DOCUMENT_TEXT_DETECTION`).

---

## Architecture
- **Framework:** FastAPI with strict Pydantic schemas aligned with `@repo/contracts`.
- **Security:** Requires `x-ocr-service-key` matching internal service secret in constant time.
- **Output:** Normalized document text, page dimensions, block/paragraph/word bounding polygons, and confidence scores.

## Running Tests
```bash
uv run pytest -v
```

## Running Service Locally
```bash
uvicorn app.main:app --port 8000 --reload
```
