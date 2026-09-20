Bu klasördeki göçler şu komutla üretilir:

```
dotnet ef migrations add <Ad> --project src/Modules/Collections/Mbb.Archive.Modules.Collections.Infrastructure --startup-project src/Host/Mbb.Archive.Api --context CollectionsDbContext --output-dir Persistence/Migrations
```
