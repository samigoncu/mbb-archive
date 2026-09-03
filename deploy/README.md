# Development Infrastructure

v0.2'de yalnızca bu faz için gerekli PostgreSQL çalıştırılır.

```bash
docker compose -f deploy/compose.infrastructure.yml --env-file .env up -d
```

RabbitMQ, Redis, OpenSearch ve object storage servisleri ihtiyaç duyulan fazda
version/ADR kararıyla compose'a eklenecektir.

Bu yaklaşım developer makinesinde gereksiz servis yükünü azaltır.
