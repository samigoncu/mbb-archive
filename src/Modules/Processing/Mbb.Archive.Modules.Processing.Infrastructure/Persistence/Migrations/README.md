# Processing Migrations

```bash
dotnet ef migrations add InitialProcessing   --project src/Modules/Processing/Mbb.Archive.Modules.Processing.Infrastructure   --startup-project src/Host/Mbb.Archive.Api   --context ProcessingDbContext   --output-dir Persistence/Migrations
```
