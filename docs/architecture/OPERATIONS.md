# Operations Baseline

## v1.4 intelligence

```text
module-owned snapshots -> alert rules -> alert instances
                                      -> notification deliveries
                                      -> management report jobs
verification runs      -> SHA-256 evidence packages
storage snapshots      -> rolling-average forecasts
security/audit events  -> minimized SIEM export port
```

All persisted intelligence remains in the `operations` schema. Thresholds are data,
not compiled constants, and alert deduplication keys are stable operational keys.

## Health

```text
GET /health/live
GET /health/ready
```

`live`:
process çalışıyor mu?

`ready`:
Documents PostgreSQL bağlantısı hazır mı?

Load balancer/Kubernetes bu iki endpoint'i farklı amaçlarla kullanmalıdır.

## Rate Limit

Dosya staging endpoint'i development foundation'da IP başına:

```text
20 request / minute
```

fixed-window limitine sahiptir.

Gerçek production limitleri reverse proxy/API gateway kapasitesi ve kullanıcı kimliği
üzerinden ayrıca tanımlanacaktır.

## Production Guard

Identity/OIDC henüz bağlanmadığı için foundation build:

```text
ASPNETCORE_ENVIRONMENT != Development
```

olduğunda varsayılan olarak startup'ı engeller.

Bu guard, unauthenticated API'nin yanlışlıkla production'a çıkmasını önlemek içindir.
Identity modülü tamamlandığında ADR ile kaldırılacaktır.
