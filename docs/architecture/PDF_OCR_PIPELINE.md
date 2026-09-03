# PDF + OCR Pipeline v0.7

```text
processing.pdf-inspection-requested.v1
    -> Python PDF Worker (pypdf)
    -> pdf-inspection-completed/failed.v1
    -> Processing Inbox + Domain
    -> if scanned PDF: processing.ocr-requested.v1

processing.ocr-requested.v1
    -> Python OCR Worker
       -> PDFium rendering
       -> Tesseract default / PaddleOCR optional
       -> OCR JSON + plain text artifacts
    -> ocr-completed/failed.v1
    -> Processing Inbox + Domain
    -> processing.ready-for-index.v1
```

Workers never write directly to PostgreSQL. Broker ACK occurs only after a result event has been publisher-confirmed.

Searchable-PDF support is present behind `OCR_SEARCHABLE_PDF_ENABLED`; it is disabled by default pending deployment/licensing review of the full OCRmyPDF native toolchain.
