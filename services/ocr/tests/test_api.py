import io
import base64
import pytest
from httpx import AsyncClient, ASGITransport
from PIL import Image, ImageDraw
from app.main import app
from app.config import config

@pytest.mark.asyncio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "tesseract_installed" in data

@pytest.mark.asyncio
async def test_auth_rejection_missing_header():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/ocr/process",
            json={"documentId": "123", "mimeType": "image/png"},
        )
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_auth_rejection_invalid_header():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/ocr/process",
            headers={"x-ocr-service-key": "invalid-wrong-secret"},
            json={"documentId": "123", "mimeType": "image/png"},
        )
        assert response.status_code == 403

@pytest.mark.asyncio
async def test_process_ocr_with_valid_key():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create test image in base64
        img = Image.new("RGB", (400, 100), color="white")
        d = ImageDraw.Draw(img)
        d.text((20, 30), "SCHOLARSHIP ELIGIBLE", fill="black")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64_data = base64.b64encode(buf.getvalue()).decode("utf-8")

        response = await client.post(
            "/api/v1/ocr/process",
            headers={"x-ocr-service-key": config.service_key},
            json={
                "documentId": "doc-api-test-001",
                "mimeType": "image/png",
                "fileBase64": b64_data,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["documentId"] == "doc-api-test-001"
        assert data["provider"] in ("TESSERACT", "MOCK")
        assert len(data["pages"]) == 1
        assert data["latencyMs"] >= 0
