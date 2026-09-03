# Evidence migration

```bash
dotnet ef migrations add InitialEvidence   --project src/Modules/Evidence/Mbb.Archive.Modules.Evidence.Infrastructure   --startup-project src/Host/Mbb.Archive.Api   --context EvidenceDbContext   --output-dir Persistence/Migrations
```
