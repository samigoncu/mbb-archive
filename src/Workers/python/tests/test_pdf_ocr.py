import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, NumberObject, DecodedStreamObject

ROOT = Path(__file__).resolve().parents[1]
for folder in ['common', 'pdf_worker', 'ocr_worker']:
    sys.path.insert(0, str(ROOT / folder))
from pdf_inspector import PdfInspector
from document_recognition import merge_embedded_text, recognize_document
from models import PageResult
from mbb_worker_common.pdf_pages import read_page_content


def page(writer, text, image=False):
    p = writer.add_blank_page(500, 700)
    font = DictionaryObject({NameObject('/Type'): NameObject('/Font'), NameObject('/Subtype'): NameObject('/Type1'), NameObject('/BaseFont'): NameObject('/Helvetica')})
    resources = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/F1'): writer._add_object(font)})})
    stream = DecodedStreamObject()
    stream.set_data(f'BT /F1 12 Tf 10 100 Td ({text}) Tj ET'.encode())
    p[NameObject('/Contents')] = writer._add_object(stream)
    if image:
        obj = DecodedStreamObject(); obj.set_data(b'\xff\xff\xff')
        obj.update({NameObject('/Type'): NameObject('/XObject'), NameObject('/Subtype'): NameObject('/Image'), NameObject('/Width'): NumberObject(1), NameObject('/Height'): NumberObject(1), NameObject('/ColorSpace'): NameObject('/DeviceRGB'), NameObject('/BitsPerComponent'): NumberObject(8)})
        resources[NameObject('/XObject')] = DictionaryObject({NameObject('/Im1'): writer._add_object(obj)})
    p[NameObject('/Resources')] = resources


class PdfOcrTests(unittest.TestCase):
    def test_large_image_parser_limit_routes_page_to_ocr(self):
        class LargeImagePage:
            def extract_text(self):
                return "Header text alone cannot exempt this scanned page."
            @property
            def images(self):
                raise ValueError("Declared stream length exceeds maximum allowed length")
        result = read_page_content(LargeImagePage())
        self.assertTrue(result.requires_ocr)
        self.assertIn("Header text", result.text)

    def inspect(self, specs):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'fixture.pdf'; writer = PdfWriter()
            for text, image in specs: page(writer, text, image)
            writer.write(path)
            return PdfInspector().inspect(path)

    def test_native_only_pdf_keeps_direct_extraction(self):
        result = self.inspect([('Native text is sufficiently long for extraction.', False)])
        self.assertFalse(result.requires_ocr)
        self.assertEqual(1, len(result.page_texts))

    def test_header_does_not_hide_image_text(self):
        result = self.inspect([('References and contact information in the header', True)])
        self.assertTrue(result.has_embedded_text)
        self.assertTrue(result.requires_ocr)

    def test_scanned_page_after_sample_limit_is_not_skipped(self):
        result = self.inspect([('Native text is sufficiently long for extraction.', False)] * 12 + [('', True)])
        self.assertTrue(result.requires_ocr)
        self.assertEqual(13, result.page_count)
        self.assertEqual(13, len(result.page_texts))

    def test_sparse_page_not_hidden_by_document_average(self):
        result = self.inspect([('Long native paragraph. ' * 50, False), ('References', False)])
        self.assertTrue(result.requires_ocr)

    def test_merge_keeps_native_and_only_adds_missing_lines(self):
        self.assertEqual('References\n2025\nHALKBANK\nZiraatPay', merge_embedded_text('References\n2025', 'References\nHALKBANK\nZiraatPay\n2025\nHALKBANK'))

    def test_only_required_pages_are_rendered_and_native_text_is_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'fixture.pdf'; writer = PdfWriter()
            page(writer, 'The exact native contract text remains unchanged.')
            page(writer, 'References header with normal native text', True)
            writer.write(path)
            class Provider:
                def recognize(self, number, image, *, sparse=False):
                    self.sparse = sparse
                    return PageResult(number, 500, 700, 'HALKBANK', 0.91, [])
            provider = Provider()
            with patch('document_recognition.render_pages', return_value=iter([(2, None)])) as render:
                results = recognize_document(path, 'application/pdf', 300, provider)
            self.assertEqual({2}, render.call_args.args[3])
            self.assertEqual('The exact native contract text remains unchanged.', results[0].text)
            self.assertIn('HALKBANK', results[1].text)
            self.assertIn('References header', results[1].text)
            self.assertTrue(provider.sparse)

if __name__ == '__main__': unittest.main()
