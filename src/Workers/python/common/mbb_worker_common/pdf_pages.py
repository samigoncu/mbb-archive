"""Shared page-level routing for PDF inspection and OCR workers."""
from dataclasses import dataclass
from pypdf import PdfReader


@dataclass(frozen=True)
class PdfPageContent:
    text: str
    requires_ocr: bool


def read_page_content(page, min_chars: int = 24) -> PdfPageContent:
    try:
        text = (page.extract_text() or "").strip()
    except Exception:
        text = ""
    # pypdf can reject a large image stream even when only its references
    # are requested. Keep its parser limits; PDFium can render the page for
    # OCR without requiring pypdf to load that image into memory.
    try:
        has_images = bool(page.images.keys())
    except Exception:
        has_images = True
    return PdfPageContent(text, has_images or len(text) < min_chars)


def read_pdf(path):
    reader = PdfReader(str(path), strict=False)
    if reader.is_encrypted and not reader.decrypt(""):
        raise ValueError("PDF is password-protected or encrypted.")
    return reader
