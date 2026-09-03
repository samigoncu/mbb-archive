# EF Core Migrations

Migration dosyaları **elle yazılmaz**.

İlk migration:

```bash
dotnet ef migrations add InitialDocuments   --project src/Modules/Documents/Mbb.Archive.Modules.Documents.Infrastructure   --startup-project src/Host/Mbb.Archive.Api   --context DocumentsDbContext   --output-dir Persistence/Migrations
```

Production deployment'ta uygulamanın kendi kendine destructive migration çalıştırması yasaktır.
Migration artifact/pipeline üzerinden kontrollü uygulanır.
