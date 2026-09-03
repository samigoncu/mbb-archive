# Audit migrations
```bash
dotnet ef migrations add InitialAudit --project src/Modules/Audit/Mbb.Archive.Modules.Audit.Infrastructure --startup-project src/Host/Mbb.Archive.Api --context AuditDbContext --output-dir Persistence/Migrations
```
