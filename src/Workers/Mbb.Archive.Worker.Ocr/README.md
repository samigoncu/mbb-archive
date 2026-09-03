# OCR Worker — v0.6 Contract

Consumes:

```text
processing.ocr-requested.v1
```

Planned engine architecture:

```text
OCR Worker
  ├── PaddleOCR provider
  ├── Tesseract/OCRmyPDF provider
  └── policy/router
```

OCR output must retain:

- page
- text
- confidence
- bounding boxes
- language
- engine/model version

Engine implementation is intentionally kept outside the Documents domain.
