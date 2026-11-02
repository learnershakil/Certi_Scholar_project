import base64
import secrets
import shutil
from fastapi import FastAPI, Header, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.responses import JSONResponse
from app.config import config
from app.models import OcrProcessRequest, NormalizedOcrResult
from app.providers import get_ocr_provider

app = FastAPI(
    title="CertiScholar OCR Microservice",
    version="1.0.0",
    docs_url="/docs-internal",
    redoc_url=None,
)

def verify_internal_service_key(x_ocr_service_key: str = Header(None, alias="x-ocr-service-key")):
    if not x_ocr_service_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing mandatory x-ocr-service-key header",
        )
    if not secrets.compare_digest(x_ocr_service_key, config.service_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid x-ocr-service-key header",
        )
    return True

@app.get("/health")
def health_check():
    tesseract_found = bool(shutil.which("tesseract"))
    return {
        "status": "ok",
        "service": "certischolar-ocr",
        "configured_provider": config.provider,
        "tesseract_installed": tesseract_found,
    }

@app.post(
    "/api/v1/ocr/process",
    response_model=NormalizedOcrResult,
    dependencies=[Depends(verify_internal_service_key)],
)
async def process_ocr(request: OcrProcessRequest):
    if not request.fileBase64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fileBase64 is required for direct payload processing",
        )

    try:
        file_bytes = base64.b64decode(request.fileBase64)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed base64 payload: {str(e)}",
        )

    provider = get_ocr_provider(config.provider)
    try:
        result = await provider.extract(
            document_id=request.documentId,
            file_bytes=file_bytes,
            mime_type=request.mimeType,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR extraction failed: {str(e)}",
        )

@app.post(
    "/api/v1/ocr/extract-file",
    response_model=NormalizedOcrResult,
    dependencies=[Depends(verify_internal_service_key)],
)
async def extract_file(
    document_id: str = Form(...),
    file: UploadFile = File(...),
):
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)",
        )

    mime_type = file.content_type or "application/octet-stream"
    provider = get_ocr_provider(config.provider)
    try:
        result = await provider.extract(
            document_id=document_id,
            file_bytes=file_bytes,
            mime_type=mime_type,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR extraction failed: {str(e)}",
        )

