import io
import time
from datetime import datetime, timezone
from PIL import Image
import pytesseract
import pypdf
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

class TesseractOcrProvider(BaseOcrProvider):
    def __init__(self, tesseract_cmd: str | None = None):
        if tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        try:
            self._version = str(pytesseract.get_tesseract_version())
        except Exception:
            self._version = "5.5.4"

    @property
    def name(self) -> str:
        return "TESSERACT"

    @property
    def version(self) -> str:
        return self._version

    def _process_image(self, img: Image.Image, page_number: int) -> NormalizedPage:
        width, height = img.size
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)

        blocks_map: dict[int, dict[int, list[NormalizedWord]]] = {}
        all_words_text: list[str] = []

        total_conf = 0.0
        conf_count = 0

        n_boxes = len(data['text'])
        for i in range(n_boxes):
            word_text = data['text'][i].strip()
            if not word_text:
                continue

            conf_raw = float(data['conf'][i])
            conf_norm = max(0.0, min(1.0, conf_raw / 100.0)) if conf_raw >= 0 else None
            if conf_norm is not None:
                total_conf += conf_norm
                conf_count += 1

            left = float(data['left'][i])
            top = float(data['top'][i])
            w = float(data['width'][i])
            h = float(data['height'][i])

            # 4 vertices: top-left, top-right, bottom-right, bottom-left
            vertices = [
                BoundingPoint(x=left, y=top),
                BoundingPoint(x=left + w, y=top),
                BoundingPoint(x=left + w, y=top + h),
                BoundingPoint(x=left, y=top + h),
            ]

            word = NormalizedWord(
                text=word_text,
                confidence=conf_norm,
                boundingPolygon=BoundingPolygon(vertices=vertices),
            )
            all_words_text.append(word_text)

            b_num = int(data['block_num'][i])
            p_num = int(data['par_num'][i])

            if b_num not in blocks_map:
                blocks_map[b_num] = {}
            if p_num not in blocks_map[b_num]:
                blocks_map[b_num][p_num] = []
            blocks_map[b_num][p_num].append(word)

        normalized_blocks: list[NormalizedBlock] = []
        for b_num, pars in blocks_map.items():
            normalized_pars: list[NormalizedParagraph] = []
            block_words: list[str] = []
            for p_num, words in pars.items():
                par_text = " ".join([w.text for w in words])
                block_words.append(par_text)
                normalized_pars.append(
                    NormalizedParagraph(
                        text=par_text,
                        words=words,
                    )
                )
            normalized_blocks.append(
                NormalizedBlock(
                    blockType="TEXT",
                    text="\n".join(block_words),
                    paragraphs=normalized_pars,
                )
            )

        avg_conf = (total_conf / conf_count) if conf_count > 0 else 0.85
        full_page_text = " ".join(all_words_text)

        return NormalizedPage(
            pageNumber=page_number,
            width=float(width),
            height=float(height),
            unit="PIXEL",
            confidence=round(avg_conf, 4),
            text=full_page_text,
            blocks=normalized_blocks,
        )

    async def extract(self, document_id: str, file_bytes: bytes, mime_type: str) -> NormalizedOcrResult:
        start_time = time.perf_counter()
        pages: list[NormalizedPage] = []

        if mime_type == "application/pdf":
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            page_count = len(reader.pages)
            for idx, pdf_page in enumerate(reader.pages):
                page_num = idx + 1
                mb = pdf_page.mediabox
                page_width = float(mb.width)
                page_height = float(mb.height)

                # Check if page has embedded images for OCR
                images = pdf_page.images
                if images:
                    first_img = images[0]
                    pil_img = Image.open(io.BytesIO(first_img.data)).convert("RGB")
                    norm_page = self._process_image(pil_img, page_number=page_num)
                    pages.append(norm_page)
                else:
                    # PDF contains text stream directly
                    extracted_text = pdf_page.extract_text() or ""
                    # Create normalized synthetic word coordinates for direct-text PDF
                    lines = [ln.strip() for ln in extracted_text.splitlines() if ln.strip()]
                    norm_blocks: list[NormalizedBlock] = []
                    curr_y = 50.0
                    for line in lines:
                        words_list = line.split()
                        norm_words: list[NormalizedWord] = []
                        curr_x = 50.0
                        for w in words_list:
                            w_len = len(w) * 8.0
                            norm_words.append(
                                NormalizedWord(
                                    text=w,
                                    confidence=0.98,
                                    boundingPolygon=BoundingPolygon(
                                        vertices=[
                                            BoundingPoint(x=curr_x, y=curr_y),
                                            BoundingPoint(x=curr_x + w_len, y=curr_y),
                                            BoundingPoint(x=curr_x + w_len, y=curr_y + 14.0),
                                            BoundingPoint(x=curr_x, y=curr_y + 14.0),
                                        ]
                                    ),
                                )
                            )
                            curr_x += w_len + 6.0
                        norm_blocks.append(
                            NormalizedBlock(
                                blockType="TEXT",
                                text=line,
                                confidence=0.98,
                                paragraphs=[
                                    NormalizedParagraph(
                                        text=line,
                                        confidence=0.98,
                                        words=norm_words,
                                    )
                                ],
                            )
                        )
                        curr_y += 20.0

                    pages.append(
                        NormalizedPage(
                            pageNumber=page_num,
                            width=page_width,
                            height=page_height,
                            unit="POINT",
                            confidence=0.98,
                            text=extracted_text,
                            blocks=norm_blocks,
                        )
                    )
        else:
            # Direct Image format (JPEG, PNG)
            pil_img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            norm_page = self._process_image(pil_img, page_number=1)
            pages.append(norm_page)

        full_doc_text = "\n\n".join([p.text for p in pages if p.text])
        latency_ms = int((time.perf_counter() - start_time) * 1000)

        return NormalizedOcrResult(
            provider="TESSERACT",
            providerVersion=self.version,
            documentId=document_id,
            fullText=full_doc_text,
            pages=pages,
            pageCount=len(pages),
            processedAt=datetime.now(timezone.utc).isoformat(),
            latencyMs=max(1, latency_ms),
        )
