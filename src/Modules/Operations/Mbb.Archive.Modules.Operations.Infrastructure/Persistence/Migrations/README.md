# Operations Migration

```bash
dotnet ef migrations add InitialOperations   --project src/Modules/Operations/Mbb.Archive.Modules.Operations.Infrastructure   --startup-project src/Host/Mbb.Archive.Api   --context OperationsDbContext   --output-dir Persistence/Migrations
```
