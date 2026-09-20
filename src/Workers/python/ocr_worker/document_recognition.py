import re
import unicodedata
from dataclasses import replace
from mbb_worker_common.pdf_pages import read_page_content, read_pdf
from models import PageResult
from renderer import render_pages


def normalized(text: str) -> str:
    return " ".join(re.findall(r"\w+", unicodedata.normalize("NFKC", text).casefold()))


def merge_embedded_text(embedded: str, recognized: str) -> str:
    """Keep the exact native layer; append OCR lines not already in that layer."""
    if not embedded:
        return recognized
    native = " " + normalized(embedded) + " "
    extra = []
    seen = set()
    for line in recognized.splitlines():
        key = normalized(line)
        if key and key not in seen and f" {key} " not in native:
            extra.append(line)
            seen.add(key)
    return "\n".join([embedded, *extra])


def recognize_document(path, mime_type, dpi, provider):
    if mime_type != "application/pdf":
        return [provider.recognize(number, image) for number, image in render_pages(path, mime_type, dpi)]
    reader = read_pdf(path)
    contents = [read_page_content(page) for page in reader.pages]
    pages = [PageResult(i+1, 0, 0, content.text, 1.0, []) for i, content in enumerate(contents)]
    needs_ocr = {i+1 for i, content in enumerate(contents) if content.requires_ocr}
    for number, image in render_pages(path, mime_type, dpi, needs_ocr):
        result = provider.recognize(number, image, sparse=bool(contents[number-1].text))
        pages[number-1] = replace(result, text=merge_embedded_text(contents[number-1].text, result.text))
    return pages
