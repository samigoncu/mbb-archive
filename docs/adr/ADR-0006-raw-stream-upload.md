# ADR-0006 — Raw Streaming Upload Endpoint

**Status:** Accepted for large-file ingestion foundation

Referans upload API'si request body'yi doğrudan stream eder.

Metadata:
- `X-File-Name`
- `Content-Type`
- `Content-Length`

Amaç:
- büyük dosyayı RAM'e almamak,
- framework multipart buffering detayına bağımlılığı azaltmak,
- ileride resumable upload protokolüne net geçiş noktası bırakmak.
