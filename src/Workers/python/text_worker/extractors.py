"""Office ve düz metin formatlarından aranabilir metin çıkarımı.

Çıkarım yalnızca standart kütüphane ile yapılır. OOXML kabı ZIP olduğu için
§28 uyarınca hem giriş başına hem toplam açılmış boyut sınırlanır; hazırlanmış
bir arşiv worker'ı belleğe boğamaz.
"""

from __future__ import annotations

import csv
import io
import re
import zipfile
from email import policy
from email.parser import BytesParser
from xml.etree import ElementTree

#: Tek bir arşiv girişinin açılmış azami boyutu.
MAX_ENTRY_BYTES = 64 * 1024 * 1024

#: Bir belgeden açılacak toplam azami boyut.
MAX_TOTAL_BYTES = 256 * 1024 * 1024

#: Metin olarak okunacak azami düz dosya boyutu.
MAX_PLAIN_TEXT_BYTES = 32 * 1024 * 1024

_OOXML_NAMESPACES = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
}


class ExtractionError(Exception):
    """Çıkarımın deterministik olarak başarısız olduğu durumlar."""

    def __init__(self, code: str, detail: str):
        super().__init__(detail)
        self.code = code
        self.detail = detail


class UnsupportedFormat(ExtractionError):
    def __init__(self, mime_type: str):
        super().__init__(
            "format_not_supported",
            f"Text extraction is not implemented for {mime_type}.",
        )


def extract(path, mime_type: str) -> tuple[list[str], str]:
    """Sayfa/parça metinlerini ve kullanılan motoru döndürür."""
    if mime_type == (
        "application/vnd.openxmlformats-officedocument"
        ".wordprocessingml.document"
    ):
        return _extract_docx(path), "ooxml-wordprocessingml"

    if mime_type == (
        "application/vnd.openxmlformats-officedocument"
        ".spreadsheetml.sheet"
    ):
        return _extract_xlsx(path), "ooxml-spreadsheetml"

    if mime_type == (
        "application/vnd.openxmlformats-officedocument"
        ".presentationml.presentation"
    ):
        return _extract_pptx(path), "ooxml-presentationml"

    if mime_type in {"application/vnd.oasis.opendocument.text", "application/vnd.oasis.opendocument.spreadsheet", "application/vnd.oasis.opendocument.presentation"}:
        with _open_ooxml(path) as archive:
            root = ElementTree.fromstring(_Budget().read(archive, "content.xml"))
            tags = {"{urn:oasis:names:tc:opendocument:xmlns:text:1.0}p", "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}h"}
            return ["\n".join("".join(node.itertext()) for node in root.iter() if node.tag in tags)], "opendocument"

    if mime_type == "message/rfc822":
        return _extract_eml(path), "rfc822"

    if mime_type in ("text/plain", "text/csv"):
        return _extract_plain_text(path), "plain-text"

    raise UnsupportedFormat(mime_type)


def _open_ooxml(path) -> zipfile.ZipFile:
    try:
        return zipfile.ZipFile(path)
    except zipfile.BadZipFile as exc:
        raise ExtractionError("container_unreadable", str(exc)[:2000]) from exc


class _Budget:
    """Açılmış toplam baytı sınırlayan sayaç."""

    def __init__(self, limit: int = MAX_TOTAL_BYTES):
        self.remaining = limit

    def read(self, archive: zipfile.ZipFile, name: str) -> bytes:
        info = archive.getinfo(name)

        if info.file_size > MAX_ENTRY_BYTES:
            raise ExtractionError(
                "entry_too_large",
                f"Archive entry {name} exceeds the decompression limit.",
            )

        if info.file_size > self.remaining:
            raise ExtractionError(
                "document_too_large",
                "Decompressed document exceeds the extraction budget.",
            )

        data = archive.read(name)
        self.remaining -= len(data)
        return data


def _extract_docx(path) -> list[str]:
    with _open_ooxml(path) as archive:
        budget = _Budget()

        if "word/document.xml" not in archive.namelist():
            raise ExtractionError(
                "container_unreadable",
                "word/document.xml is missing from the container.",
            )

        root = ElementTree.fromstring(budget.read(archive, "word/document.xml"))

    paragraphs = []

    for paragraph in root.iter(f"{{{_OOXML_NAMESPACES['w']}}}p"):
        text = "".join(
            node.text or ""
            for node in paragraph.iter(f"{{{_OOXML_NAMESPACES['w']}}}t")
        )

        if text.strip():
            paragraphs.append(text)

    return ["\n".join(paragraphs)] if paragraphs else []


def _extract_xlsx(path) -> list[str]:
    with _open_ooxml(path) as archive:
        budget = _Budget()
        names = set(archive.namelist())

        shared: list[str] = []

        if "xl/sharedStrings.xml" in names:
            shared_root = ElementTree.fromstring(
                budget.read(archive, "xl/sharedStrings.xml")
            )

            for item in shared_root.iter(f"{{{_OOXML_NAMESPACES['s']}}}si"):
                shared.append(
                    "".join(
                        node.text or ""
                        for node in item.iter(f"{{{_OOXML_NAMESPACES['s']}}}t")
                    )
                )

        sheets = sorted(
            name
            for name in names
            if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", name)
        )

        pages = []

        for sheet in sheets:
            root = ElementTree.fromstring(budget.read(archive, sheet))
            pages.append(_read_sheet(root, shared))

    return [page for page in pages if page.strip()]


def _read_sheet(root, shared: list[str]) -> str:
    namespace = _OOXML_NAMESPACES["s"]
    lines = []

    for row in root.iter(f"{{{namespace}}}row"):
        values = []

        for cell in row.iter(f"{{{namespace}}}c"):
            value_node = cell.find(f"{{{namespace}}}v")
            inline = cell.find(f"{{{namespace}}}is")

            if inline is not None:
                values.append(
                    "".join(
                        node.text or ""
                        for node in inline.iter(f"{{{namespace}}}t")
                    )
                )
                continue

            if value_node is None or value_node.text is None:
                continue

            if cell.get("t") == "s":
                index = int(value_node.text)
                values.append(shared[index] if index < len(shared) else "")
            else:
                values.append(value_node.text)

        if any(value.strip() for value in values):
            lines.append("\t".join(values))

    return "\n".join(lines)


def _extract_pptx(path) -> list[str]:
    with _open_ooxml(path) as archive:
        budget = _Budget()

        slides = sorted(
            name
            for name in archive.namelist()
            if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)
        )

        pages = []

        for slide in slides:
            root = ElementTree.fromstring(budget.read(archive, slide))

            text = "\n".join(
                node.text
                for node in root.iter(f"{{{_OOXML_NAMESPACES['a']}}}t")
                if node.text and node.text.strip()
            )

            pages.append(text)

    return [page for page in pages if page.strip()]


def _extract_eml(path) -> list[str]:
    with open(path, "rb") as handle:
        message = BytesParser(policy=policy.default).parse(handle)

    headers = [
        f"{name}: {value}"
        for name, value in message.items()
        if name.lower() in ("from", "to", "cc", "subject", "date")
    ]

    body = message.get_body(preferencelist=("plain", "html"))
    content = ""

    if body is not None:
        # Charset bildirmeyen iletilerde get_content() us-ascii varsayar ve
        # Türkçe karakterleri bozar; ham yükü kendimiz çözüyoruz.
        if body.get_content_charset() is None:
            content = _decode(body.get_payload(decode=True) or b"")
        else:
            content = body.get_content()

        if body.get_content_type() == "text/html":
            content = re.sub(r"<[^>]+>", " ", content)

    attachments = [
        f"[ek] {part.get_filename()}"
        for part in message.iter_attachments()
        if part.get_filename()
    ]

    parts = ["\n".join(headers), content.strip(), "\n".join(attachments)]
    return [part for part in parts if part.strip()]


def _extract_plain_text(path) -> list[str]:
    size = path.stat().st_size

    if size > MAX_PLAIN_TEXT_BYTES:
        raise ExtractionError(
            "document_too_large",
            "Plain text document exceeds the extraction limit.",
        )

    text = _decode(path.read_bytes())

    if _looks_like_delimited(text):
        text = _normalize_delimited(text)

    return [text] if text.strip() else []


def _decode(data: bytes) -> str:
    """Kurum içi belgelerde görülen kodlamaları sırayla dener."""
    for encoding in ("utf-8", "utf-8-sig", "cp1254", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue

    raise ExtractionError(
        "encoding_not_detected",
        "Text encoding could not be determined.",
    )


def _looks_like_delimited(text: str) -> bool:
    sample = text[:8192]

    try:
        csv.Sniffer().sniff(sample, delimiters=",;\t|")
        return True
    except csv.Error:
        return False


def _normalize_delimited(text: str) -> str:
    """Ayraçlı içeriği hücre metnine indirger; arama hücre değerini bulur."""
    try:
        dialect = csv.Sniffer().sniff(text[:8192], delimiters=",;\t|")
        rows = csv.reader(io.StringIO(text), dialect)
        return "\n".join("\t".join(row) for row in rows)
    except csv.Error:
        return text
