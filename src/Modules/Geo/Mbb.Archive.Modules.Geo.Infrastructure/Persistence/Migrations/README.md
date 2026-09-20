Bu klasördeki göçler şu komutla üretilir:

```
dotnet ef migrations add <Ad> --project src/Modules/Geo/Mbb.Archive.Modules.Geo.Infrastructure --startup-project src/Host/Mbb.Archive.Api --context GeoDbContext --output-dir Persistence/Migrations
```

Not: geometri PostGIS `geometry` sütunu yerine GeoJSON metni + sınırlayıcı kutu
olarak saklanır. `postgres:18-alpine` imajında PostGIS bulunmuyor; kesin uzamsal
yüklemler gerektiğinde imaj `postgis/postgis` ile değiştirilip `geometry`
sütunu ayrı bir göçle eklenebilir. Mevcut kolonlar bu geçişi engellemez.
