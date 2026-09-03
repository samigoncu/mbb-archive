# AccessControl migrations
```bash
dotnet ef migrations add InitialAccessControl --project src/Modules/AccessControl/Mbb.Archive.Modules.AccessControl.Infrastructure --startup-project src/Host/Mbb.Archive.Api --context AccessDbContext --output-dir Persistence/Migrations
```
