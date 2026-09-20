# PDF + OCR Pipeline v0.7

```text
processing.pdf-inspection-requested.v1
    -> Python PDF Worker (pypdf)
    -> pdf-inspection-completed/failed.v1
    -> Processing Inbox + Domain
    -> if any page contains images or insufficient native text: processing.ocr-requested.v1

processing.ocr-requested.v1
    -> Python OCR Worker
       -> PDFium rendering
       -> Tesseract default / PaddleOCR optional
       -> page-level rendering (mixed PDFs: native text + image OCR)
       -> merged OCR JSON + plain text artifacts
    -> ocr-completed/failed.v1
    -> Processing Inbox + Domain
    -> processing.ready-for-index.v1
```

Workers never write directly to PostgreSQL. Broker ACK occurs only after a result event has been publisher-confirmed.

Office documents use `processing.text-extraction-requested.v1`. The text worker preserves the original, converts a temporary copy with LibreOffice, runs the shared PDF recognition pipeline, and publishes extracted text, OCR JSON and a separate `PdfNormalized` artifact in the extended text-extraction result. Supported formats: DOCX/XLSX/PPTX, ODT/ODS/ODP, DOC/XLS/PPT. Native source text is merged with rendered page text so spreadsheet cells outside PDF print areas remain searchable.

`GET /api/v1/processing/documents/{id}/preview` reports readiness for the latest authorized document version. `/preview/content` streams the derived PDF (including range requests for local files); `?download=true` downloads it. Both use document scope checks, and content access requires `documents.download` and creates an audit entry. The original content endpoint remains separate. See `docs/reviews/2026-09-06-office-pdf-renditions.md` for evidence and deployment requirements.

Searchable-PDF support is present behind `OCR_SEARCHABLE_PDF_ENABLED`; it is disabled by default pending deployment/licensing review of the full OCRmyPDF native toolchain.

PDF inspection considers every page, rather than a document-wide text average. Native-only pages bypass OCR. Image-bearing pages use rendered OCR even when headers or paragraphs provide embedded text; native text is retained in the merged output. See `docs/reviews/2026-09-06-mixed-pdf-ocr.md` for verification and limitations.
