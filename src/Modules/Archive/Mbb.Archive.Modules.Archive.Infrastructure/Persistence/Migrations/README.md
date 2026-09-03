# Archive migrations
```bash
dotnet ef migrations add InitialArchive --project src/Modules/Archive/Mbb.Archive.Modules.Archive.Infrastructure --startup-project src/Host/Mbb.Archive.Api --context ArchiveDbContext --output-dir Persistence/Migrations
```
