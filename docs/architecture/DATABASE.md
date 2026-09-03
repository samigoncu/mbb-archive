# Database Architecture

## Ana karar

PostgreSQL tek instance ile başlayabilir, fakat bounded context ownership schema ile ayrılır.

İlk schema:

```text
documents.documents
documents.document_versions
documents.file_ingestions
documents.outbox_messages
```

## Kurallar

- Başka bounded context `documents.*` tablolarına doğrudan join yapmaz.
- Binary content DB'ye yazılmaz.
- Explicit optimistic concurrency token kullanılır.
- JSON yalnız doğal JSON veri için kullanılır; ilişkisel model yerine kaçış kapısı değildir.
- Production migration otomatik destructive çalışmaz.
- Büyük tablolar için partition kararı ölçüm sonrası verilir.

## ID

Yeni aggregate/entity kimliklerinde zaman sıralı UUIDv7 tercih edilir.

## Read model

Command path aggregate yükleyebilir.
Liste/rapor sorguları `AsNoTracking` projection ile yapılır.
İleride ağır raporlar ayrı read model/schema'ya çıkarılabilir.
