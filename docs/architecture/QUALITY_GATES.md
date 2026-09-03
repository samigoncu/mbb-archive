# Quality Gates

`RULES.md` yalnızca dokümantasyon değildir.

Repository seviyesinde:

```bash
python scripts/verify_architecture.py
```

aşağıdaki kuralları otomatik kontrol eder:

- Domain -> Infrastructure/Presentation yasağı
- Domain içinde EF/ASP.NET/Npgsql gibi teknoloji dependency'leri
- Application -> Infrastructure/Presentation yasağı
- cross bounded-context direct reference yasağı
- cross context yalnız Contracts üzerinden
- `.Result` / `.Wait()` yasağı
- generic `IRepository<T>` yasağı
- 400+ satırlık C# dosya guard'ı
- solution/project reference bütünlüğü

VS Code / CI:

```powershell
./scripts/verify.ps1
```

ile architecture + build + tests + frontend typecheck/build birlikte çalıştırılır.
