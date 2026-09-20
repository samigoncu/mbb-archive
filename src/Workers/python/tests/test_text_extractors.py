import io
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "text_worker"))

from extractors import ExtractionError, UnsupportedFormat, extract  # noqa: E402

DOCX = (
    "application/vnd.openxmlformats-officedocument"
    ".wordprocessingml.document"
)
XLSX = (
    "application/vnd.openxmlformats-officedocument"
    ".spreadsheetml.sheet"
)
PPTX = (
    "application/vnd.openxmlformats-officedocument"
    ".presentationml.presentation"
)

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
S = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"


def write_temp(data: bytes, suffix: str) -> Path:
    handle = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    handle.write(data)
    handle.close()
    return Path(handle.name)


def build_zip(entries: dict[str, str]) -> bytes:
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in entries.items():
            archive.writestr(name, content)

    return buffer.getvalue()


class DocxTests(unittest.TestCase):
    def test_reads_paragraph_text(self):
        document = (
            f'<w:document xmlns:w="{W}"><w:body>'
            "<w:p><w:r><w:t>UKOME Kararı</w:t></w:r>"
            "<w:r><w:t> 2026/152</w:t></w:r></w:p>"
            "<w:p><w:r><w:t>Hal Yolu trafik düzenlemesi</w:t></w:r></w:p>"
            "</w:body></w:document>"
        )

        path = write_temp(
            build_zip({"word/document.xml": document}),
            ".docx",
        )

        pages, engine = extract(path, DOCX)

        self.assertEqual("ooxml-wordprocessingml", engine)
        self.assertIn("UKOME Kararı 2026/152", pages[0])
        self.assertIn("Hal Yolu trafik düzenlemesi", pages[0])

    def test_rejects_container_without_document_part(self):
        path = write_temp(build_zip({"word/other.xml": "<x/>"}), ".docx")

        with self.assertRaises(ExtractionError) as raised:
            extract(path, DOCX)

        self.assertEqual("container_unreadable", raised.exception.code)


class XlsxTests(unittest.TestCase):
    def test_resolves_shared_strings(self):
        shared = (
            f'<sst xmlns="{S}">'
            "<si><t>Mahalle</t></si>"
            "<si><t>Yeşilyurt</t></si>"
            "</sst>"
        )

        sheet = (
            f'<worksheet xmlns="{S}"><sheetData>'
            '<row><c t="s"><v>0</v></c><c t="s"><v>1</v></c></row>'
            '<row><c><v>2026</v></c></row>'
            "</sheetData></worksheet>"
        )

        path = write_temp(
            build_zip(
                {
                    "xl/sharedStrings.xml": shared,
                    "xl/worksheets/sheet1.xml": sheet,
                }
            ),
            ".xlsx",
        )

        pages, _ = extract(path, XLSX)

        self.assertIn("Mahalle\tYeşilyurt", pages[0])
        self.assertIn("2026", pages[0])


class PptxTests(unittest.TestCase):
    def test_reads_one_page_per_slide(self):
        def slide(text: str) -> str:
            return f'<sld xmlns:a="{A}"><a:t>{text}</a:t></sld>'

        path = write_temp(
            build_zip(
                {
                    "ppt/slides/slide1.xml": slide("Sunum"),
                    "ppt/slides/slide2.xml": slide("İkinci sayfa"),
                }
            ),
            ".pptx",
        )

        pages, _ = extract(path, PPTX)

        self.assertEqual(["Sunum", "İkinci sayfa"], pages)


class EmailTests(unittest.TestCase):
    def test_reads_headers_and_body(self):
        eml = (
            "From: yazi@mbb.gov.tr\r\n"
            "To: ulasim@mbb.gov.tr\r\n"
            "Subject: Hal Yolu\r\n"
            "\r\n"
            "Karar ekte iletilmiştir.\r\n"
        )

        path = write_temp(eml.encode("utf-8"), ".eml")
        pages, engine = extract(path, "message/rfc822")

        self.assertEqual("rfc822", engine)
        self.assertIn("Subject: Hal Yolu", pages[0])
        self.assertIn("Karar ekte iletilmiştir.", pages[1])


class PlainTextTests(unittest.TestCase):
    def test_reads_utf8(self):
        path = write_temp("Şube Müdürlüğü".encode("utf-8"), ".txt")
        pages, engine = extract(path, "text/plain")

        self.assertEqual("plain-text", engine)
        self.assertEqual(["Şube Müdürlüğü"], pages)

    def test_normalizes_delimited_content(self):
        path = write_temp(b"kod;ad\n01;Battalgazi\n02;Yesilyurt\n", ".csv")
        pages, _ = extract(path, "text/csv")

        self.assertIn("kod\tad", pages[0])
        self.assertIn("01\tBattalgazi", pages[0])

    def test_falls_back_to_legacy_encoding(self):
        path = write_temp("Müdürlük".encode("cp1254"), ".txt")
        pages, _ = extract(path, "text/plain")

        self.assertEqual(["Müdürlük"], pages)


class UnsupportedTests(unittest.TestCase):
    def test_legacy_binary_office_is_reported_explicitly(self):
        path = write_temp(b"\xd0\xcf\x11\xe0", ".doc")

        with self.assertRaises(UnsupportedFormat) as raised:
            extract(path, "application/msword")

        self.assertEqual("format_not_supported", raised.exception.code)


class DecompressionLimitTests(unittest.TestCase):
    def test_rejects_oversized_entry(self):
        from extractors import MAX_ENTRY_BYTES

        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            info = zipfile.ZipInfo("word/document.xml")
            archive.writestr(info, b"a" * 16)

        data = bytearray(buffer.getvalue())
        path = write_temp(bytes(data), ".docx")

        # Girişin bildirilen açılmış boyutunu sınırın üstüne çekerek
        # sıkıştırma bombası davranışını taklit ediyoruz.
        with zipfile.ZipFile(path) as archive:
            info = archive.getinfo("word/document.xml")
            info.file_size = MAX_ENTRY_BYTES + 1

            from extractors import _Budget

            with self.assertRaises(ExtractionError) as raised:
                _Budget().read(archive, "word/document.xml")

        self.assertEqual("entry_too_large", raised.exception.code)


if __name__ == "__main__":
    unittest.main()
