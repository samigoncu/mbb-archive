Bu klasördeki göçler şu komutla üretilir:

```
dotnet ef migrations add <Ad> --project src/Modules/Organization/Mbb.Archive.Modules.Organization.Infrastructure --startup-project src/Host/Mbb.Archive.Api --context OrganizationDbContext --output-dir Persistence/Migrations
```
