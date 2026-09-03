# ADR-0011 — Python for PDF/OCR Workers

**Status:** Accepted

The .NET modular monolith remains the transactional/domain platform. PDF/OCR execution runs in isolated Python workers because the mature OCR/document ecosystem is stronger there.

Workers communicate only through versioned RabbitMQ contracts and object storage. They do not connect to PostgreSQL and cannot bypass Processing domain rules.

Default OCR provider is Tesseract. PaddleOCR is an optional provider. PDF rendering uses pypdfium2 instead of AGPL-licensed PyMuPDF in the default implementation.
