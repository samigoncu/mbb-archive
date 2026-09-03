# ADR-0010 — Processing as Separate Bounded Context

**Status:** Accepted

OCR/PDF/index/quality pipeline Documents domain içine gömülmez.

Processing bounded context:

- processing job lifecycle
- worker routing
- processing state
- retry/failure orchestration

sorumluluğunu alır.

Documents yalnız orijinal kayıt ve belge yaşam döngüsünü bilir.
