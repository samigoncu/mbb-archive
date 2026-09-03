# Processing Architecture

```text
documents.original-stored.v1
        ↓
Processing Consumer
        ↓
processing.inbox_messages
        ↓
ProcessingJob
        ↓
MIME route
  ┌─────┴────────┐
  │              │
PDF            Image
  │              │
  ▼              ▼
pdf-inspection  ocr-requested
requested.v1       .v1
```

## Database ownership

```text
processing.jobs
processing.inbox_messages
processing.outbox_messages
```

Processing context, Documents tablolarına JOIN yapmaz.
Documents ile yalnız public integration contracts üzerinden konuşur.

## Initial routing

```text
application/pdf -> PDF inspection
image/tiff      -> OCR
image/jpeg      -> OCR
image/png       -> OCR
other           -> Unsupported
```

Bu policy ileride configurable processing profile'a taşınabilir.

## v0.7 hedefi

PDF Worker:
- structural validation
- embedded text detection
- page metadata
- normalization
- PDF/A

OCR Worker:
- PaddleOCR
- OCRmyPDF/Tesseract fallback
- word/page coordinates
- confidence
- searchable PDF/text artifacts
