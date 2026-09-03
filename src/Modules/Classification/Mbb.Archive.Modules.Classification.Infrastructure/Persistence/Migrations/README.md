# Classification migrations

```bash
dotnet ef migrations add InitialClassification   --project src/Modules/Classification/Mbb.Archive.Modules.Classification.Infrastructure   --startup-project src/Host/Mbb.Archive.Api   --context ClassificationDbContext   --output-dir Persistence/Migrations
```
