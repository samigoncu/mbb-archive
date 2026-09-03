# PDF Worker — v0.6 Contract

Consumes:

```text
processing.pdf-inspection-requested.v1
```

Responsibilities in v0.7:

- validate PDF structure
- page count
- encrypted/password-protected detection
- embedded-text detection
- rotation/orientation metadata
- normalization decision
- PDF/A conversion request/result
- OCR necessity decision

PDF processing is never performed inside the API request.
