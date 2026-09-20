import io
import pytest
from PIL import Image, ImageDraw
import pypdf
from app.providers.tesseract_provider import TesseractOcrProvider

@pytest.mark.asyncio
async def test_tesseract_image_extraction():
    provider = TesseractOcrProvider()
    
    # Generate test image
    img = Image.new("RGB", (600, 200), color="white")
    d = ImageDraw.Draw(img)
    d.text((30, 40), "CENTRAL BOARD OF EDUCATION", fill="black")
    d.text((30, 90), "MARKS OBTAINED: 472", fill="black")
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    file_bytes = img_byte_arr.getvalue()
    
    result = await provider.extract(
        document_id="doc-test-123",
        file_bytes=file_bytes,
        mime_type="image/png",
    )
    
    assert result.provider == "TESSERACT"
    assert result.documentId == "doc-test-123"
    assert result.pageCount == 1
    assert len(result.pages) == 1
    page = result.pages[0]
    assert page.width == 600.0
    assert page.height == 200.0
    assert len(page.blocks) > 0
    # Text should be found
    full_text_upper = result.fullText.upper()
    assert "BOARD" in full_text_upper or "EDUCATION" in full_text_upper or "CENTRAL" in full_text_upper

@pytest.mark.asyncio
async def test_tesseract_pdf_text_extraction():
    provider = TesseractOcrProvider()
    
    # Create simple PDF in memory using pypdf
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=612, height=792)
    pdf_bytes_io = io.BytesIO()
    writer.write(pdf_bytes_io)
    pdf_bytes = pdf_bytes_io.getvalue()
    
    result = await provider.extract(
        document_id="doc-pdf-456",
        file_bytes=pdf_bytes,
        mime_type="application/pdf",
    )
    
    assert result.provider == "TESSERACT"
    assert result.documentId == "doc-pdf-456"
    assert result.pageCount == 1
    assert result.pages[0].width == 612.0
    assert result.pages[0].height == 792.0
