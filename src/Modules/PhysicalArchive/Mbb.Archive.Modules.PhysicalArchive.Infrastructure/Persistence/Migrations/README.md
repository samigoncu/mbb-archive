# Physical Archive migration

```bash
dotnet ef migrations add InitialPhysicalArchive   --project src/Modules/PhysicalArchive/Mbb.Archive.Modules.PhysicalArchive.Infrastructure   --startup-project src/Host/Mbb.Archive.Api   --context PhysicalArchiveDbContext   --output-dir Persistence/Migrations
```
