# Retention migrations
```bash
dotnet ef migrations add InitialRetention --project src/Modules/Retention/Mbb.Archive.Modules.Retention.Infrastructure --startup-project src/Host/Mbb.Archive.Api --context RetentionDbContext --output-dir Persistence/Migrations
```
