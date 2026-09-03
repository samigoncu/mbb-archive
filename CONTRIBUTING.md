# Contributing

## Branch / PR ilkeleri

- Bir PR tek ana amaca hizmet eder.
- Refactor ile feature mümkün olduğunca ayrı tutulur.
- Büyük code dump yerine küçük review edilebilir commit'ler tercih edilir.
- Yeni bounded context dependency'si ADR gerektirebilir.

## PR öncesi

```powershell
./scripts/verify.ps1
```

başarılı olmalıdır.

## Review kontrolü

- İş kuralı doğru katmanda mı?
- Domain invariant korunuyor mu?
- Yetkilendirme etkisi var mı?
- Transaction/outbox etkisi var mı?
- Büyük dosya memory'e alınıyor mu?
- Hata yolu test edildi mi?
- Log/metric gerekli mi?
- Yeni dependency gerçekten gerekli mi?
- Public contract versioning etkisi var mı?
