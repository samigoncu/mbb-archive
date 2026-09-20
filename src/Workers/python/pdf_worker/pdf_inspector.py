from dataclasses import dataclass
from pathlib import Path
from mbb_worker_common.pdf_pages import read_page_content, read_pdf


@dataclass(frozen=True)
class PdfInspection:
    page_count: int
    pdf_version: str
    encrypted: bool
    has_embedded_text: bool
    requires_ocr: bool
    extracted_character_count: int
    page_texts: tuple[str, ...] = ()


class PdfInspector:
    def __init__(self, min_chars_per_page: int = 24):
        self.min_chars_per_page = min_chars_per_page

    def inspect(self, path: Path) -> PdfInspection:
        try:
            reader = read_pdf(path)
        except ValueError as exc:
            if "password-protected" not in str(exc):
                raise
            return PdfInspection(0, "unknown", True, False, False, 0)
        pages = [read_page_content(page, self.min_chars_per_page) for page in reader.pages]
        texts = tuple(page.text for page in pages)
        return PdfInspection(
            len(pages), getattr(reader, "pdf_header", "unknown"), False,
            any(texts), any(page.requires_ocr for page in pages),
            sum(map(len, texts)), texts,
        )
