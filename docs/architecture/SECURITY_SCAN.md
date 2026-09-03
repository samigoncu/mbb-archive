# Security Scan Pipeline

```text
documents.file-staged.v1
        ↓
RabbitMQ
        ↓
Security Scan Worker
        ├── local/shared staging reader
        ├── magic signature detection
        └── ClamAV INSTREAM
        ↓
clean?
 ┌──────┴───────┐
 │              │
yes             no
 │              │
 ▼              ▼
approved.v1   rejected.v1
 │              │
 └──────┬───────┘
        ▼
Documents security-result consumer
        ↓
Inbox check
        ↓
Domain state mutation
        ↓
Inbox + state = same DB transaction
```

## Delivery safety

RabbitMQ .NET 7.x consumer body callback dışında tutulmadığı için body ilk anda byte[]'e kopyalanır.

Manual ACK yalnız application handler başarılı olduktan sonra gönderilir.

Security Worker aynı staged event'i tekrar alırsa aynı result EventId üretilir.
Documents Inbox bu sonucu idempotent olarak işler.
