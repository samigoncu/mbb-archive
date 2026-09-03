# Messaging Architecture

## Development versions

```text
RabbitMQ Server: 4.3.5
RabbitMQ.Client: 7.2.2
```

## Topology

```text
mbb.archive.events (topic)
        │
        │ documents.file-staged.v1
        ▼
mbb.archive.ingestion.security.v1
        │
        └── dead-letter
             ▼
        mbb.archive.dlx
             ▼
mbb.archive.ingestion.security.v1.dead
```

## Outbox publisher

```text
documents.outbox_messages
        │
        │ FOR UPDATE SKIP LOCKED
        ▼
short lease
        │
        ▼
RabbitMQ publish
        │
        ▼
publisher confirm
        │
        ▼
processed_at
```

Çoklu API instance aynı satırı paralel claim etmez.

## Failure policy

Broker publish başarısızlığında:

```text
AttemptCount + 1
NextAttemptAt = exponential backoff
```

Maksimum deneme sonrasında:

```text
DeadLetteredAt != null
```

olur.

DB Outbox dead-letter ile RabbitMQ consumer DLQ farklı kavramlardır.

- DB dead-letter: broker'a ulaştırılamayan integration event.
- RabbitMQ DLQ: broker'a ulaşmış fakat consumer tarafından işlenememiş message.

## Sonraki aşama

- manual ACK
- Inbox
- idempotency
- Security Scan Worker
- ClamAV
- MIME signature detection
