# Original Storage

## Güven zinciri

```text
staging
  ↓
signature detection
  ↓
ClamAV
  ↓
SecurityApproved
  ↓
promotion-requested
  ↓
Original Storage
  ├── SHA-256 verify
  ├── size verify
  └── content-addressed key
  ↓
DocumentVersion
  ↓
Accepted
  ↓
original-stored.v1
```

Original storage'a security gate atlanarak yazmak yasaktır.

## Providers

Development:

```text
LocalOriginalObjectStorage
```

Production:

```text
S3OriginalObjectStorage
```

S3-compatible deployment'ta bucket seviyesinde:

- versioning
- object lock / retention
- encryption
- restricted delete permission
- backup/replication

ayrıca uygulanmalıdır.
