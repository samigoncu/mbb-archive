import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import zipfile
from extractors import ExtractionError, UnsupportedFormat, extract, MAX_ENTRY_BYTES, MAX_TOTAL_BYTES
from office_formats import OFFICE_FORMATS
from document_recognition import recognize_document, merge_embedded_text

PROFILE = '''<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry">
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop><prop oor:name="DisableMacrosExecution" oor:op="fuse"><value>true</value></prop></item>
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="SecureURL" oor:op="fuse"><value/></prop></item>
</oor:items>'''


def validate_container(path):
    if not zipfile.is_zipfile(path): return
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if len(entries) > 10000 or sum(x.file_size for x in entries) > MAX_TOTAL_BYTES or any(x.file_size > MAX_ENTRY_BYTES for x in entries):
            raise ExtractionError('office_container_too_large', 'Office package exceeds decompression limits.')
        if any(x.flag_bits & 1 for x in entries):
            raise ExtractionError('office_encrypted', 'Encrypted Office files cannot be converted.')


def convert_office(path, mime_type, work, target_format="pdf"):
    if target_format not in {"pdf", "docx", "xlsx", "pptx"}: raise ValueError("Unsupported conversion output")
    validate_container(path)
    source = work / ('source' + OFFICE_FORMATS[mime_type])
    shutil.copyfile(path, source)
    profile = work / 'profile'; (profile / 'user').mkdir(parents=True)
    (profile / 'user' / 'registrymodifications.xcu').write_text(PROFILE)
    output = work / 'output'; output.mkdir()
    if os.geteuid() == 0:
        for item in [work, *work.rglob('*')]: os.chown(item, 65534, 65534)
    # Empty environment prevents credentials from leaking into conversion output.
    env = {'PATH': '/usr/local/bin:/usr/bin:/bin', 'HOME': str(work), 'TMPDIR': str(work), 'LANG': 'C.UTF-8', 'SAL_USE_VCLPLUGIN': 'svp'}
    command = [sys.executable, str(Path(__file__).with_name('converter_sandbox.py')), str(work), '/usr/bin/libreoffice',
               '-env:UserInstallation=' + profile.as_uri(), '--headless', '--nologo', '--nodefault', '--norestore',
               '--convert-to', target_format, '--outdir', str(output), str(source)]
    with (work / 'conversion.log').open('wb') as log:
        process = subprocess.Popen(command, cwd=work, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            code = process.wait(timeout=int(os.getenv('OFFICE_CONVERSION_TIMEOUT_SECONDS', '120')))
        except subprocess.TimeoutExpired as exc:
            os.killpg(process.pid, signal.SIGKILL); process.wait()
            raise ExtractionError('office_conversion_timeout', 'Office PDF conversion timed out.') from exc
    pdf = output / ('source.' + target_format)
    if code or not pdf.is_file():
        print(f'Office converter exited with code {code}; PDF present: {pdf.is_file()}', flush=True)
        print((work / 'conversion.log').read_text(errors='replace')[-2000:], flush=True)
        raise ExtractionError('office_conversion_failed', 'Office PDF conversion failed. The original is preserved.')
    with pdf.open('rb') as stream:
        if target_format == 'pdf' and stream.read(5) != b'%PDF-': raise ExtractionError('office_invalid_pdf', 'Converter did not produce a PDF.')
    return pdf


def convert_to_pdf(path, mime_type, work):
    return convert_office(path, mime_type, work)


def process_office(source, storage, provider):
    path = storage.download_original(source['originalStorageKey'])
    try:
        with tempfile.TemporaryDirectory(prefix='mbb-office-') as folder:
            pdf = convert_to_pdf(path, source['mimeType'], Path(folder))
            dpi = int(os.getenv('OCR_RENDER_DPI', '300'))
            pages = recognize_document(pdf, 'application/pdf', dpi, provider)
            if not pages: raise ExtractionError('office_empty_pdf', 'Converted PDF contains no pages.')
            rendered = '\n\n'.join(page.text for page in pages)
            # Include spreadsheet cells outside print areas, plus native source
            # text that is not visible in the PDF. Never invent page coordinates.
            try: native = '\n\n'.join(extract(path, source['mimeType'])[0])
            except UnsupportedFormat:
                legacy = {'application/msword': 'docx', 'application/vnd.ms-excel': 'xlsx', 'application/vnd.ms-powerpoint': 'pptx'}
                target = legacy.get(source['mimeType'])
                if target:
                    native_work = Path(folder) / 'native'; native_work.mkdir()
                    converted = convert_office(path, source['mimeType'], native_work, target)
                    native_mime = next(mime for mime, extension in OFFICE_FORMATS.items() if extension == '.' + target)
                    native = '\n\n'.join(extract(converted, native_mime)[0])
                else: native = '' 
            full_text = merge_embedded_text(native, rendered)
            confidence = sum(page.average_confidence for page in pages) / len(pages)
            version = subprocess.run(['/usr/bin/libreoffice', '--version'], capture_output=True, text=True, check=True).stdout.strip()
            json_data = {'schemaVersion': 'mbb.ocr.v1', 'engine': provider.name, 'engineVersion': provider.version,
                         'converter': version, 'languages': provider.languages, 'renderDpi': dpi, 'pageCount': len(pages),
                         'averageConfidence': confidence, 'pages': [page.as_dict() for page in pages]}
            return {'engine': 'LibreOffice+' + provider.name, 'engineVersion': version + '/' + provider.version,
                    'languages': provider.languages, 'averageConfidence': confidence, 'pageCount': len(pages),
                    'characterCount': len(full_text),
                    'textArtifact': storage.put_artifact('ExtractedText', (full_text or '\n').encode(), 'text/plain'),
                    'jsonArtifact': storage.put_artifact('OcrJson', json.dumps(json_data, ensure_ascii=False).encode(), 'application/json'),
                    'pdfArtifact': storage.put_artifact('PdfNormalized', pdf.read_bytes(), 'application/pdf')}
    finally: storage.cleanup_download(path)
