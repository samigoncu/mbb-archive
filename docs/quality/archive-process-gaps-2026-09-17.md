# Arşiv süreç eksikleri — 17 Eylül 2026

Güncel çalışma ağacının kaynak kodu ve bu incelemede çalıştırılan kontroller esas alınmıştır. Uygulama kodu veya arşiv kayıtları değiştirilmedi. Önceden mevcut, commit edilmemiş değişiklikler korunmuştur. Bulgular tam bir güvenlik denetimi veya mevzuata uygunluk değerlendirmesi değildir.

## Öncelikli düzeltmeler

### 1. Kritik — imha tamamlanmadan dosyalar silinmiş gibi tutanak üretiliyor

`ExecuteDestruction` protokol referansını kaydedip süreç ve saklama dosyasını tamamlıyor. Komut bu değişikliği ve outbox olayını kaydediyor; depo silme sonucu beklemiyor. Buna rağmen tutanak, işlem türü imha olduğu için `destructionExecuted=true` ve `originalFilesDeleted=true` üretiyor. Kaynakta bu olayı tüketip asılları silen yürütücü bulunamadı; özgün dosya deposu arabiriminde silme işlemi de yok.

- Kanıt: `src/Modules/Retention/Mbb.Archive.Modules.Retention.Domain/Disposition/DispositionProcess.cs:118`, `src/Modules/Retention/Mbb.Archive.Modules.Retention.Application/Disposition/DispositionCommandHandler.cs:69`, `src/Modules/Retention/Mbb.Archive.Modules.Retention.Application/Disposition/DispositionReceiptHandler.cs:19`.
- Etki: kayıt ve tutanak gerçek silmenin gerçekleştiğini doğrulamadan başarı bildiriyor.
- Tamamlama koşulu: idari karar ile gerçek yürütme ayrılmalı; asıl/sürüm/türev envanteri, ortak kullanılan nesneler, hukuki bloke ve depo kilitleri kontrol edilmeli; doğrulanmış yürütme sonucu olmadan silme beyanı veya tamamlanmış durum üretilmemeli.

### 2. Kritik — kayıt beyanı ve saklama işlemlerinde birim kapsamı kontrolü eksik

Arşiv okuma sorgusu kullanıcının kapsamını uygular; kayıt beyanı komutu ise verilen kimlikle kaydı doğrudan alır. Endpoint genel işlem iznini kontrol eder, kaynak birimini kontrol etmez. Saklama/devir sorguları ve hukuki bloke komutlarında da birim veya belge görünürlük filtresi bulunmuyor. Host izin kontrolü bu filtreyi kendiliğinden eklemiyor.

- Kanıt: `src/Modules/Archive/Mbb.Archive.Modules.Archive.Application/Records/Declare/DeclareArchiveRecordCommandHandler.cs:21`, `src/Modules/Retention/Mbb.Archive.Modules.Retention.Infrastructure/Persistence/EfDispositionRepository.cs:10`, `src/Modules/Retention/Mbb.Archive.Modules.Retention.Application/Holds/Place/PlaceLegalHoldCommandHandler.cs:13`, `src/Host/Mbb.Archive.Api/Infrastructure/PermissionAuthorization.cs:55`.
- Etki: ilgili işlem izni olan bir kullanıcının başka birime ait kayıtta işlem yapmasını engelleyen kaynak kapsamı kontrolü eksik. Canlı farklı kullanıcı testi yapılmadı.
- Tamamlama koşulu: beyan ve saklama komutlarına kaynak kapsamı eklenmeli; merkezî arşiv yetkisi ayrıca tanımlanmalı; kapsam dışı okuma/yazma olumsuz testlerle doğrulanmalı. Retention'ın merkezî rol olarak tasarlanması amaçlanıyorsa bu kural açıkça belgelenmeli ve uygulanmalı.

## Kullanıcının tamamlayamadığı işlemler

### 3. Belgenin süreç ve tamamlanan görev geçmişi

Belge detayındaki Akış sekmesi koşulsuz boş durum gösteriyor. Mevcut görev sorgusu açık görevleri listeliyor; belgeye ait süreç geçmişini sunmuyor. Atama ve tamamlama işlemleri mevcut.

- Kanıt: `web/src/features/documents/components/document-workspace.tsx:484`, `src/Modules/Workflow/Mbb.Archive.Modules.Workflow.Infrastructure/WorkflowInfrastructure.cs:271`, `src/Modules/Workflow/Mbb.Archive.Modules.Workflow.Application/WorkflowQueries.cs:29`.
- Gerekli iş: belge bazında aktif ve tamamlanmış görevler, kararlar, aktörler ve zaman çizelgesini API ve ekrana bağlamak.

### 4. Başarısız OCR/işleme için yeniden deneme

Yeniden işleme API'si mevcut, fakat web uygulamasında çağrısı veya kullanıcı eylemi yok. Mevcut domain işlemi yalnız Completed/Failed durumundaki PDF işleri için çalışıyor; görüntü ve Office işleri bu tekrar deneme yoluna dahil değil.

- Kanıt: `src/Modules/Processing/Mbb.Archive.Modules.Processing.Presentation/ProcessingEndpoints.cs:41`, `src/Modules/Processing/Mbb.Archive.Modules.Processing.Domain/Jobs/ProcessingJob.cs:116`; `web/src` içinde reprocess çağrısı bulunmadı.
- Gerekli iş: yetkili kullanıcının hata sebebini görmesi, uygun işleri yeniden başlatması ve yeni sonucu takip etmesi.

### 5. Ödünç verirken 100 dosya sınırı ve alıcı doğrulaması

Ödünç formu ilk 100 uygun fiziksel dosyayı alıyor; seçim kutusunda dosya araması veya sayfalama yok. İlk 100 dışındaki uygun dosyalar bu ekrandan seçilemiyor. Alıcı serbest kullanıcı kimliği olarak giriliyor; komut/domain gerçek kullanıcı varlığını doğrulamıyor.

- Kanıt: `web/src/app/odunc/page.tsx:18`, `web/src/features/loans/components/loan-process-manager.tsx:35` ve `:55`; `PhysicalArchiveCommandHandlers.cs:232`, `PhysicalLoan.cs:24`.
- Gerekli iş: tüm yetkili dosyalara ulaşan arama/sayfalama ve doğrulanmış personel seçimi. Ödünç/iade yaşam döngüsü bütünüyle eksik değildir.

### 6. Belge-belge ilişkileri

Önceki karar, ek belge ve ilgili belge bağlantılarının modeli ve işlemleri yok. Koleksiyon, fiziksel klasör ve coğrafi varlık bağlantıları mevcut.

- Kanıt: `web/src/features/documents/components/document-workspace.tsx:421`.
- Gerekli iş: ilişki türleri, ekleme/çıkarma, karşılıklı görüntüleme, görünürlük kontrolü ve denetim kaydı.

## Arşiv yaşam döngüsünün eksik bağlantıları

### 7. Dijital arşiv devri

Alıcı arşiv ve tutanak referansı girilerek idari teslim kaydı tamamlanabiliyor. Belge asıllarını, üstveriyi ve doğrulama manifestini içeren devir paketi; paket doğrulaması ve alıcıdan doğrulanmış kabul zinciri bulunmuyor.

- Kanıt: `src/Modules/Retention/Mbb.Archive.Modules.Retention.Domain/Disposition/DispositionProcess.cs:92`, `src/Modules/Retention/Mbb.Archive.Modules.Retention.Application/Disposition/DispositionReceiptHandler.cs:18`.
- Gerekli iş: paket oluşturma, içerik/hash doğrulama, teslim durumu ve kabul kanıtını işleme bağlamak.

### 8. Saklama kuralı/hukuki bloke ile WORM eşitlemesi

S3 Object Lock desteği var; bütün nesnelere yapılandırılmış tek bir gün süresi uyguluyor. Saklama kuralı veya sonradan konan hukuki bloke ile depo kilidini eşitleyen işlem bulunmuyor. S3 yazma yanıtındaki VersionId kaydedilmiyor; okuma anahtar üzerinden yapılıyor.

- Kanıt: `src/Modules/Documents/Mbb.Archive.Modules.Documents.Infrastructure/Storage/S3OriginalObjectStorage.cs:58`, `:84` ve `:95`; `src/Modules/Retention/Mbb.Archive.Modules.Retention.Application/Holds/Place/PlaceLegalHoldCommandHandler.cs:16`.
- Gerekli iş: nesne sürüm kimliği, kayıt bazında saklama süresi, bloke koyma/kaldırma ve depo kilidi sonuçlarını tutarlı yönetmek. Canlı bucket yapılandırması bu incelemede doğrulanmadı.

### 9. Komisyon üyeliği ve vekâlet

Bağımsız değerlendirme, mükerrer görüş engeli ve ayrı nihai onaylayan kontrolleri var. Komisyon görevlendirmesi serbest referans metni; değerlendiren kişinin o komisyona atanmışlığı, görev süresi ve vekâleti doğrulanmıyor.

- Kanıt: `src/Modules/Retention/Mbb.Archive.Modules.Retention.Domain/Disposition/DispositionProcess.cs:49` ve `:64`.
- Gerekli iş: komisyon/üye/görevlendirme kayıtları ile işlem bazında yetkiyi bağlamak.

## Operasyon ve kurumsal bağlantılar

### 10. Alarmdan bildirime otomatik işlem zinciri

Alarm kuralı ve bildirim veri modelleri, ayrıca gönderici adaptörleri var. Kuralları değerlendirip alarm açan, bildirimi kuyruğa alan ve göndericiyi çalıştıran uygulama zinciri bulunmuyor. Alarm/bildirim hatası metrikleri sabit sıfır yayımlanıyor.

- Kanıt: `src/Modules/Operations/Mbb.Archive.Modules.Operations.Infrastructure/OperationsModule.cs:39`, `:59`; `src/Modules/Operations/Mbb.Archive.Modules.Operations.Infrastructure/OperationalMetricsPublisher.cs:102`. `AlertInstance.Open` ve `NotificationDelivery.Queue` çağrıları yalnız testlerde bulundu.
- Gerekli iş: değerlendirme, kuyruk, gönderim, hata/tekrar deneme ve gerçek metrikler. SMTP bilgisi eklemek tek başına yeterli değil.

### 11. LDAP personel ve birim eşitlemesinin işletilmesi

LDAP okuyucu ve eşitleme servisi var; senkron metotlarını çağıran endpoint, zamanlanmış iş veya giriş kancası bulunmuyor. Kullanıcı birim değiştirince eski üyelikler kaldırılmıyor, yalnız birincil olma durumu kapatılıyor; eski birim erişiminin sürmesi riski ayrıca ele alınmalı.

- Kanıt: `src/Modules/Organization/Mbb.Archive.Modules.Organization.Infrastructure/OrganizationModule.cs:40`, `src/Modules/Organization/Mbb.Archive.Modules.Organization.Infrastructure/Directory/DirectorySyncService.cs:49`, `:140` ve `:178`.
- Gerekli iş: kontrollü eşitleme çalıştırma/izleme, ayrılan veya taşınan personelin üyelik temizliği ve gerçek kurum bağlantısıyla doğrulama.

### 12. EYP, EBYS/KEP ve PDF imza doğrulama adaptörleri

EYP resmî doğrulama ve paket üretimi DI içinde Unavailable adaptörlere bağlı; EBYS/KEP aktarım adaptörleri bulunmuyor. PDF/PAdES doğrulayıcı da Unavailable. Bunlar yalnız yapılandırma işi değil, uygulanması gereken bağlantılar.

- Kanıt: `src/Modules/OfficialCorrespondence/Mbb.Archive.Modules.OfficialCorrespondence.Infrastructure/OfficialCorrespondenceModule.cs:33`, `src/Modules/Evidence/Mbb.Archive.Modules.Evidence.Infrastructure/EvidenceModule.cs:41`; Integrations modülünde yalnız README var.
- CMS ve RFC3161 doğrulayıcıları mevcut; bunların eksik olduğu sonucu çıkarılmamalı.

### 13. Kurtarma tatbikatının başarı kriteri

Tatbikatı başarılı kapatırken kanıt referansı boş bırakılabiliyor. Ölçülen RPO/RTO hedefleri aşsa da istemcinin passed değeri doğrudan kabul ediliyor.

- Kanıt: `src/Modules/Operations/Mbb.Archive.Modules.Operations.Domain/Recovery/RecoveryDrill.cs:94`.
- Gerekli iş: kurumun başarı ölçütleri ve kanıt gereksinimini sonuca bağlamak. Gerçek izole geri yükleme, hash ve audit zinciri doğrulaması ayrıca yapılmalı. API'nin üretim sistemini otomatik geri yüklememesi eksik olarak değerlendirilmedi.

## Eksik kod ile doğrulanmamış entegrasyonun ayrımı

- Eski sürüm seçme, önizleme ve indirme bağlantısı güncel kodda mevcut; geçmişteki eksik artık geçerli değil. Tarihsel sürümün OCR metni sekmesi halen desteklenmiyor (`document-workspace.tsx:365`).
- OIDC, WFS ve RFC3161 istemci implementasyonları mevcut. Canlı yapılandırma ve kurumla uçtan uca başarı bu incelemede doğrulanmadı; bunlar doğrudan “kod yok” olarak sınıflandırılmadı.
- Çoklu hukuki bloke, kaldırma gerekçesi, sınıflandırma/saklama kuralı doğrulaması, bağımsız görüş/nihai onay, sürüm çakışması kontrolü ve outbox mevcut.
- Gerçek büyük PDF yükleme/OCR, tarayıcı donanımı, imha, dış arşive teslim ve kurtarma tatbikatı yapılmadı.

## Bu incelemede çalıştırılan kontroller

| Kontrol | Güncel sonuç |
|---|---|
| .NET çözüm testleri, derleme etkin | 272 başarılı, 0 başarısız, 39 atlanan |
| Web testleri | 57 dosyada 193 başarılı |
| TypeScript | Başarılı |
| Next.js üretim derlemesi | Başarılı; geçici kaynak kopyasında, mevcut node_modules ile, .env kopyalanmadan |
| Mimari doğrulama | Başarılı |
| git diff --check | Başarılı |
| Python keşif testleri | 12 başarılı; 2 test modülü yerel Python'da pypdf bulunmadığı için yüklenemedi |
| Yerel API/web bağlantısı | Bu oturumdan localhost:5080 ve localhost:3000 bağlantıları kurulamadı |
| Canlı kullanıcı akışı / görsel kabul | Yapılmadı |

.NET'te atlanan 39 test, izole PostgreSQL/OpenSearch bağlantısı gerektiren kontrollerdir. Geçmiş raporlardaki 311 başarılı sonucu bu turun sonucu olarak kullanılmadı. Python bağımlılık eksikliği uygulama OCR hatası olarak sınıflandırılmadı.

Komutlar: `dotnet test Mbb.Archive.slnx --no-restore --verbosity quiet -m:1 -p:UseSharedCompilation=false`, `npm --prefix web run test -- --reporter=dot`, `npm --prefix web run typecheck`, geçici web kopyasında `npm run build`, `python3 scripts/verify_architecture.py`, `git diff --check`, `PYTHONPATH=src/Workers/python/common python3 -m unittest discover -s src/Workers/python/tests -v`.

İlk geliştirme sırası: yanlış imha beyanı ve kaynak kapsamı; ardından belge süreç geçmişi, tekrar işleme ve ödünç seçimi; sonra devir/WORM/komisyon ve operasyon bağlantıları.
