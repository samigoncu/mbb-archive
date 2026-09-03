# Document Ingestion Pipeline

## v0.2 uygulanan bölüm

```text
Client
  │ raw stream
  ▼
API
  │
  ▼
Document.BeginFileIngestion
  │
  ▼
Local Staging Adapter
  ├── stream to disk
  ├── SHA-256
  └── max-size enforcement
  │
  ▼
file_ingestions
+
outbox_messages
(same PostgreSQL transaction)
```

## Sonraki aşama

```text
Outbox Publisher
  ↓
RabbitMQ
  ↓
Antivirus Worker
  ↓
MIME / file signature validation
  ↓
Original Object Storage
  ↓
PDF normalization
  ↓
OCR
  ↓
Metadata extraction
  ↓
OpenSearch
  ↓
Quality Control
  ↓
Archive acceptance
```

## Neden raw body?

Büyük belgelerde `multipart/form-data` binder'ın kontrolsüz buffering davranışına
bağımlı kalmamak için referans upload endpoint'i raw request body stream eder.

Filename:
`X-File-Name`

Content type:
`Content-Type`

File size:
`Content-Length`

Resumable/chunked upload ayrı bir bounded capability olarak v0.4+ aşamasında
tasarlanacaktır.
