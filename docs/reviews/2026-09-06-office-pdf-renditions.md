# Office originals and PDF viewing copies — 2026-09-06

Office uploads retain their immutable original and produce a separate PDF viewing copy. Supported formats are DOCX, XLSX, PPTX, ODT, ODS, ODP, DOC, XLS and PPT. The existing text worker performs conversion, page recognition and native text extraction; the existing search pipeline indexes the result. No schema migration is introduced by this feature.

## User flow

1. Upload an Office document from the document upload panel or Tarama ve İndeksleme. Office documents are submitted individually; the scanning action rejects mixed or multiple Office selections before creating a record.
2. Security scanning and original promotion run before conversion. The UI shows PDF preparation while the worker runs.
3. The document viewer displays the derived PDF. “Orijinali indir” retains the Office extension and original bytes; “PDF kopyasını indir” downloads the viewing copy.
4. Native document text and text recognized from rendered images are indexed. Conversion failure is shown explicitly and leaves the original available.

The preview lookup loads artifacts for the latest version through the Processing repository. It does not accept arbitrary storage keys. Both status and content check document visibility, content requires download permission, and preview/download access is audited.

## Verification

- Solution build passed with zero warnings/errors. Final solution test run: 201 passed, 20 skipped because their optional database configuration was absent; no failures. Skips are not database validation.
- Frontend: 98 tests passed, typecheck and production build passed. Python: 20 tests passed. Architecture verification passed.
- Actual LibreOffice conversion of all nine formats passed in the Linux worker container. Each fixture contains native text and an embedded image with `GORSEL ARSIV 7392`; output recognition contained both, while original SHA-256 stayed unchanged.
- Live uploads of DOCX, XLSX and ODT passed through the deployed services. Each produced a downloadable PDF with `%PDF-` signature, HTTP 206 byte-range support, unchanged original bytes and the correct original filename extension. Searching `7392` found all three documents.
- A real Chrome screenshot confirmed the DOCX PDF rendering and both download controls at 1440 × 1100.
- Converter isolation was exercised: the child read its work file, could not read an unrelated file or `/proc/1/environ`, and could not create an AF_INET socket.

Local evidence: `/tmp/mbb-office-{backend-build,backend-tests,web-tests,web-build,typecheck,python-tests,architecture,format-check,sandbox-check,live-check,ui-check}.log`, `/tmp/mbb-office-preview.png`, `/tmp/mbb-office-fixtures/format-results.json`. The three reviewable test records are listed in `/tmp/mbb-office-live-documents.json` and titled “Office PDF Testi DOCX / XLSX / ODT”.

## Deployment and limits

The text-worker image includes LibreOffice Writer/Calc/Impress, Tesseract Turkish/English and shared PDF recognition dependencies. Conversion uses an isolated profile with macros disabled, an unprivileged UID, Linux Landlock file access limits, seccomp network restrictions, and CPU/memory/output/time limits. Unsupported sandbox kernels fail conversion rather than bypassing isolation. Defaults: 120-second conversion timeout, 300 DPI, `tur+eng`; compose exposes these settings.

Configure `Processing:Artifacts` consistently with worker output storage. Local deployment was verified. S3 streaming is implemented but was not exercised against a live S3 service.

This is a viewing PDF, not a PDF/A certification or an OCR text-layer guarantee inside downloaded images. OCR text is indexed separately. Fonts, spreadsheet print areas and page layout can affect the rendered copy. Native spreadsheet cells outside print areas remain in full-text search without fabricated page coordinates. OCR accuracy depends on image quality and stylized logos can still be missed. Existing completed Office uploads are not automatically backfilled; this change applies to new processing jobs.

A separate, pre-existing local database mismatch was observed during this run: `archive.records.owner_unit_path` is missing while the checkout contains the `AddArchiveRecordOwnerUnit` migration. It causes Archive consumer retries and is outside this PDF change. No unrelated migration or user document was modified to hide that condition; the upload/PDF/search path above passed despite it. This report does not claim the entire archive environment is ready.
