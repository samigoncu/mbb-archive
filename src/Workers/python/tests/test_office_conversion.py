from pathlib import Path
import sys
import tempfile
import unittest
import zipfile
ROOT = Path(__file__).resolve().parents[1]
for folder in ['common', 'ocr_worker', 'text_worker']: sys.path.insert(0, str(ROOT / folder))
from office_conversion import validate_container
from extractors import ExtractionError, extract

class OfficeConversionTests(unittest.TestCase):
    def test_odf_native_text_is_extracted(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'test.odt'
            with zipfile.ZipFile(path,'w') as archive:
                archive.writestr('content.xml','<root xmlns:t="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><t:p>Native office text</t:p></root>')
            self.assertEqual(['Native office text'],extract(path,'application/vnd.oasis.opendocument.text')[0])
    def test_archive_entry_limit_prevents_conversion(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'oversized.odt'
            with zipfile.ZipFile(path,'w') as archive:
                for i in range(10001): archive.writestr(str(i),'')
            with self.assertRaises(ExtractionError) as error: validate_container(path)
            self.assertEqual('office_container_too_large', error.exception.code)

if __name__ == '__main__': unittest.main()
