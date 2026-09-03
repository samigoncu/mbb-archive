# Project Granularity

## Karar

İlk referans bounded context olan `Documents`, şu dört assembly ile ayrılır:

- Domain
- Application
- Infrastructure
- Presentation

Bu sayede dependency direction compiler seviyesinde görülebilir.

Diğer bounded context'ler ilk etapta placeholder olarak tutulur.
Bir bounded context üzerinde geliştirme başladığında `Documents` kalıbı kopyalanmaz;
iş alanının karmaşıklığı değerlendirilerek aynı 4 assembly yaklaşımı uygulanır.

Amaç solution'ı gereksiz yere onlarca boş `.csproj` ile doldurmak değildir.

## Neden?

Profesyonel mimari, en fazla proje sayısına sahip mimari değildir.
Sınırların net, bağımlılıkların kontrollü ve değişikliklerin lokal olması esastır.
