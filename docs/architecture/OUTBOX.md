# Transactional Outbox

## Problem

DB commit başarılı olup queue publish başarısız olursa belge pipeline'ı sessizce durabilir.

## Çözüm

Application integration event'i `IOutbox` içine ekler.

`DocumentsDbContext.SaveChangesAsync` aynı transaction içinde:

1. aggregate değişikliklerini
2. `documents.outbox_messages`

kaydeder.

Queue publisher henüz v0.2'de bağlanmamıştır.

## Event naming

Public event isimleri versioned ve stable olmalıdır:

```text
documents.file-staged.v1
```

CLR namespace/type adı integration contract olarak kullanılmaz.

## Consumer kuralı

RabbitMQ fazında consumer'lar at-least-once delivery varsayımıyla
idempotent tasarlanacaktır.
