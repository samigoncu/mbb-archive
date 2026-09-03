# Official Correspondence migration

```bash
dotnet ef migrations add InitialOfficialCorrespondence   --project src/Modules/OfficialCorrespondence/Mbb.Archive.Modules.OfficialCorrespondence.Infrastructure   --startup-project src/Host/Mbb.Archive.Api   --context OfficialCorrespondenceDbContext   --output-dir Persistence/Migrations
```
