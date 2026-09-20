# MBB arşiv platformu — uygulama ve ürün yeterlilik incelemesi

İnceleme: 5 Eylül 2026. Referans: `../../../CLAUDE_MBB_ARCHIVE_IMPLEMENTATION.md`.
Başlangıç commit'i: `0be9737`. İnceleme commit edilmemiş değişiklikleri de kapsar.

## Karar

**Önemli bir uygulama temeli mevcut; bütün büyükşehir belediyesi belge ve arşiv süreçleri tamamlanmış değil.** Arayüzün bulunması, saklama–devir–imha ve kurumsal erişim zincirinin tamamlandığı anlamına gelmiyor. OpenText düzeyinde bütünleşik kayıt yönetimi ya da rakiplerden üstünlük iddiasını destekleyecek uçtan uca ve ölçek testleri henüz yok.

Bu rapor mevcut kod, çalışan yerel API ve çalıştırılan testlere dayanır. Dosyaların hangi asistan tarafından yazıldığı commit edilmemiş çalışma üzerinden kesin olarak belirlenemez. Kullanıcının bildirdiği Claude rol/yetki çalışması devam eden iş olarak değerlendirilmiştir. **Bu inceleme uygulama, rol, yetki veya migration dosyalarını değiştirmez.** Canlı kontroller GET istekleridir; belge yükleme, kayıt beyanı, yetki verme veya imha gerçekleştirilmemiştir. GET uçları olağan erişim denetim kayıtları üretebilir.

## 1. Doğrulanan durum

| Kontrol | Sonuç | Sınır |
|---|---|---|
| API derlemesi | Başarılı, 0 hata / 0 uyarı | `dotnet build src/Host/Mbb.Archive.Api/Mbb.Archive.Api.csproj --no-restore --verbosity quiet -m:1 -p:UseSharedCompilation=false` |
| Backend testleri | 17 test projesinde 115 test başarılı | `dotnet test Mbb.Archive.slnx --no-restore --verbosity quiet -m:1 -p:UseSharedCompilation=false`; üretim entegrasyon kanıtı değil |
| Frontend typecheck | Başarılı | `npm run typecheck` |
| Frontend testleri | 3 dosyada 20 test başarılı | `npm test`; çoğu üstveri, arama filtresi ve denetim modeli |
| Frontend üretim derlemesi | Başarılı | Çalışan geliştirme dizinine çakışmaması için `/tmp` altında kaynak kopyasında; mevcut `node_modules` kullanıldı, `.env` kopyalanmadı |
| Python testleri | 12 test başarılı | `PYTHONPATH=src/Workers/python/common python3 -m unittest discover -s src/Workers/python/tests -v` |
| Mimari betiği | **Başarısız** | `python3 scripts/verify_architecture.py`: `GeoHandlers.cs` 423 satır, 400+ refactor kuralı |
| Yerel OpenAPI | 88 farklı yol | İşlevlerin tamamlandığı anlamına gelmez |
| Tarayıcıyla görsel kontrol | Yapılamadı | CUA kullanılabilir tarayıcı bildirmedi; arayüz bulguları kaynak kodu/derleme üzerinden |

İlk .NET çalıştırması sandbox iletişim soketi nedeniyle, ilk web derlemesi Google Fonts ağ erişimi nedeniyle başarısız oldu; gerekli erişimle tekrarları geçti. İlk Python keşfindeki ortak modül import hatası doğru `PYTHONPATH` ile giderildi. Bunlar uygulama hatası olarak sayılmadı. Web üretim derlemesinin Google Fonts indirmesine bağımlılığı çevrimdışı belediye kurulumunda ayrıca ele alınmalı.

Yerel sistemin salt okunur kontrolü:

| Uç / alan | Gözlem |
|---|---|
| `/health/ready` | HTTP 200 |
| Belgeler | HTTP 200, 12 belge |
| `Hal Yolu` araması | HTTP 200, 4 sonuç |
| Arşiv kayıtları | HTTP 200, 7 kayıt; bu sayının tamamı beyan edilmiş kayıt demek değildir |
| Saklama kuralları | HTTP 200, 3 kural |
| Saklama dosyaları | HTTP 200, 0 dosya |
| Görevlerim | HTTP 200, 0 açık görev |
| Koleksiyonlar | HTTP 200, 1 koleksiyon |
| CBS katmanları | HTTP 200, 1 katman |
| İmza yetenekleri | CMS ve RFC3161 var; PDF/PAdES `provider-boundary; no compliance claim until configured` bildiriyor |
| e-Yazışma yetenekleri | Yapısal OPC incelemesi var; resmî 2.1 doğrulama, paket oluşturma ve güncelleme adaptörleri `false` |

Boş görev/saklama listesi tek başına hata değildir; ilgili iş akışının başarıyla işletildiğine dair kanıt da değildir. Kontroller küçük geliştirme verisiyle yapılmıştır.

## 2. Direktifteki fazlar gerçekten tamam mı?

Burada **kısmi**, çalışan alt parçalar bulunduğunu fakat fazın bütün kabul koşullarının karşılanmadığını gösterir.

| Faz / gereksinim | Durum | Kodda görülen / kalan |
|---|---|---|
| 0 — Keşif ve rapor | Var, güncelleme gerekli | `docs/current-state-analysis.md` mevcut; bazı bölümler birbirini ve güncel kodu tutmuyor |
| 1 — Navigasyon, ana çalışma merkezi | Büyük ölçüde var | `nav-items.ts`, `home-hub.tsx`; favori, son kullanım ve kayıtlı arama deneyiminin tamamı yok |
| 2 — Belge gezgini | Büyük ölçüde var | Liste, filtre, detay paneli, sıralama ve sayfalama; kalıcı kişisel görünümler eksik |
| 3 — Görüntüleyici | Kısmi | PDF orijinali iframe'de, bazı görseller, üstveri, metin, sürümler, CBS ve audit; Office/TIFF türev sunumu, belge ilişkileri ve belgeye bağlı workflow görünümü eksik |
| 4 — Dinamik üstveri | Kısmi | Şema, alan, yayınlama, doğrulama ve seed betikleri var; `DocumentType` modeli ve tam şema yönetim deneyimi yok. Alan tipleri 10 adet; User/OrganizationUnit/Lookup/DocumentRelation/GeoRelation gibi türlerin tamamı yok |
| 5 — Arama | Kısmi | OpenSearch, OCR/metin, üstveri, MIME/dosya planı facet'leri, CBS adları ve eşleşme açıklaması var; kayıtlı arama, kapsamlı tarih/birim/kayıt/saklama/CBS filtreleri ve işletilebilir reindex işi eksik |
| 6 — CBS | Çalışan temel var | Nesne kimliği, provider, layer, feature, typed belge–CBS ilişkisi, iki yönlü sorgu ve arama bağlantısı var; kesin PostGIS kesişim/mesafe sorguları ve olay sırası güvencesi tamam değil |
| 7 — Records | Kısmi | Candidate/Declared, süre hesabı, hold ve eligible durumu var; tam değerlendirme–onay–devir/imha–kanıt zinciri yok |
| 8 — Workflow / fiziksel arşiv | Kısmi | Workflow tanımı/geçişi, görev sorgusu/tamamlama; fiziksel konum, klasör, taşıma ve ödünç/iade uçları var. Görsel süreç tasarımı ve belediye süreçlerinin tamamı bağlanmamış |
| §19 — İş/dava/proje çalışma alanı | Eksik | Fiziksel klasör ve koleksiyon, belge+karar+harita+görev+timeline bütünlüğündeki Business Workspace'i karşılamıyor |
| §20 — Koleksiyon | Var | Gerçek API ve kullanıcı arayüzü mevcut |
| §21 — Yetki | Devam eden çalışma | Uç bazında izinler mevcut; belge/birim/alan bazında erişim ve arama sonuçlarının kapsamı ayrıca doğrulanmalı |
| §31 — Tamamlanma tanımı | Tam karşılanmıyor | Tüm uçtan uca süreç testleri yok; mimari betiği başarısız; ekranlardaki bazı işlemler kalıcı değil |

Özellikle §30 Hal Yolu senaryosunun arama kısmı canlıda yanıt veriyor. Bunun bütün 17 adımı bu incelemede tekrar yürütülmedi. `DocumentType`, türev önizleme ve sürüm akışının bütün kabul koşulları ayrıca sınanmalı; bu nedenle “senaryonun tamamı doğrulandı” denemez.

## 3. Üretimden önce kapatılacak somut açıklar

### R1 — Saklama ve imha ekranı tam bir işlem akışı değil

Kanıt: `web/src/app/devir-imha/page.tsx` açıkça “İmha yürütme bu ekrandan yapılamaz” diyor. `RetentionEndpoints.cs` yalnız liste, kural oluşturma, hold koyma/kaldırma uçlarını sunuyor. `RetentionCase.cs` uygunluğu hesaplıyor; komisyon kararı, kontrollü yürütme ve imha belgesi davranışı bulunmuyor. `retention.case-eligible.v1` üretiliyor; bunu tamamlanmış devir/imha sürecine dönüştüren tüketici bulunamadı.

Tamamlama: aday listesi → gerekçe/inceleme → komisyon kararı → gerekli onaylar → yürütmeden hemen önce hold ve saklama kontrolü → kalıcı arşive devir veya kontrollü imha → tutanak ve doğrulanabilir kanıt. Fiziksel ve dijital nüsha sonuçları ayrı izlenmeli. Sırf süresi doldu diye silme yapılmamalı.

### R2 — Kayıt beyanının saklama kuralı ve tekrar işleme güvencesi eksik

Kanıt: `ArchiveRecord.Declare` verilen sınıflandırma ve saklama kodunun yalnız boş olup olmadığını kontrol ediyor. `DeclareArchiveRecordCommandHandler` ilgili kodların gerçek/pasif/geçerli durumunu sorgulamıyor. Var olmayan kural, daha sonra `ScheduleRetentionCaseCommandHandler` içinde bulunamıyor; tüketici başarısız sonucu reject ediyor. Böylece beyan ile saklama dosyası arasında kopukluk oluşabilir.

Aynı beyan tekrarlandığında aggregate erken dönse de handler yeni `EventId` ile olay yayımlıyor. Saklama handler'ının inbox kontrolü `MessageId` temelli; kayıt kimliği üzerinden tekrar oluşturmayı önleyecek davranış ayrıca doğrulanmalı. Bu, statik kod bulgusudur; canlı kayıt değiştirilerek denenmedi.

Tamamlama: modüller arası sözleşmeyle kural/sınıflandırma uygunluğunu doğrulama, aynı kayıt için idempotent beyan ve schedule, atomik benzersizlik, hatalı olayların görünür telafi akışı. Geçersiz kod ve yeniden teslim için entegrasyon testi.

### R3 — WORM adaptörü mevcut, bütün yaşam döngüsü güvencesi henüz yok

Kanıt: `S3OriginalObjectStorage.StoreAsync` yalnız ilk PUT sırasında genel `RetentionDays` kullanıyor. Nesne varsa erken dönüyor. `StoredOriginalDescriptor` S3 `VersionId` taşımıyor; okuma yalnız anahtarla yapılıyor. Saklama/hold değişikliklerini S3 retention/legal-hold ayarlarına taşıyan bir akış bulunamadı. Depodaki varsayılan `Worm.Enabled=false`; canlı ortam değişkenlerinin bunu değiştirip değiştirmediği bu incelemede doğrulanmadı.

İçerik adresli anahtar tek başına değiştirilemezlik garantisi değildir. Aynı içerik daha uzun süre saklanacak başka bir kayda bağlandığında, en uzun geçerli yükümlülük ve bütün aktif hold'lar korunmalı. Kalıcı kayıtlar sabit bir gün sayısıyla yeterince modellenmez.

Tamamlama: storage version kimliğini saklama/okuma, kayıt politikasına bağlı lock süresi, mevcut nesne lock uzatma, hold senkronizasyonu, gerçek Object Lock sağlayıcısında negatif silme/değiştirme testleri. Yerel read-only dosya davranışı production WORM kanıtı sayılmamalı.

### R4 — Rol ekranından ayrı olarak belge kapsamı güvenliği tamamlanmalı

Kanıt: İncelenen `ISearchGateway.SearchRequest` sorgu/format/dosya planı/üstveri taşıyor; kullanıcının belge veya birim erişim kapsamını taşımıyor. `EfDocumentQueries` ve OpenSearch adapter'ında bu kapsamın uygulanması bulunamadı. Mevcut endpoint izinleri hangi eyleme erişilebildiğini kontrol ediyor; hangi belgelere erişilebildiğini tek başına çözmüyor.

Claude'un devam eden işi bittikten sonra: A birimi kullanıcısı B biriminin gizli belgesini liste, arama, facet sayısı, OCR, harita, koleksiyon, sürüm ve doğrudan indirmede görememeli. Önizleme ile indirme izinleri de açıkça ayrılmalı; mevcut viewer orijinal içerik ucunu ve `documents.download` iznini kullanıyor. Hassas üstveri alanları ayrıca süzülmeli.

### R5 — Tanımlamalarda kalıcı olmayan işlemler var

Kanıt: `definitions-manager-view.tsx` içinde `handleSaveUnit`, `handleSaveFtp` gibi yollar React state değiştirip başarı mesajı veriyor. Birim/seri dışa aktarma düğmelerinin bazıları yalnız `toast.success` çağırıyor. “Yeni belge türü” yalnız bilgilendirme mesajı açıyor. Bu bulgu gerçek dosya planı API'sinin olmadığı anlamına gelmez; `tanimlamalar/page.tsx` dosya planını gerçekten getiriyor.

Tamamlama: her etkin işlem gerçek API/kalıcılık/yeniden okuma ile çalışmalı; desteklenmeyen işlem açıkça devre dışı olmalı. Yenileme sonrası koruma, farklı oturumdan görünürlük ve gerçekten indirilen çıktı kontrol edilmeli. Aynı dosyadaki kullanıcı/rol alanı Claude'un işiyle çakışabileceğinden bu incelemede değiştirilmedi.

### R6 — Türev görüntüleme ve format desteği eksik

Kanıt: `document-workspace.tsx` PDF ve belirli görseller dışındaki içerik için türev desteğinin bulunmadığını söylüyor. Canlı OpenAPI'de preview/rendition sunan yol yok. `text_worker` DOCX/XLSX/PPTX/TXT/CSV/EML çıkarıyor; eski DOC/XLS/PPT ve MSG için destek yok. Görüntüleyicide ilişkiler ve workflow sekmeleri de eksik bağlantıları bildiriyor.

Tamamlama: original → rendition → search representation ayrımını depolama ve API'de tamamlamak; Office→PDF, TIFF çok sayfa, sayfa küçük görselleri, format başına güvenli işleme ve kaynak sürümüne bağlı türev kimliği. OCR koordinat highlight ucunu viewer'a bağlamak. Eski formatları kontrollü adapter ile desteklemek veya yükleme sırasında destek sınırını açıklamak.

### R7 — CBS olayları geç gelirse arama görünümü eskiye dönebilir

Kanıt: `SearchDocument.ReplaceGeoRelations` gelen listeyi doğrudan atıyor; kaynak sürümü/eski olay kontrolü yok. `ApplyGeoRelationsCommand` zaman içeriyor, fakat monoton kaynak revizyonu taşımıyor. Tam liste göndermek aynı olay tekrarını kolaylaştırır; farklı olayların ters sırada gelmesini çözmez. Mevcut durum raporundaki ters sıralamada da tutarlılık iddiası bu nedenle desteklenmiyor.

Tamamlama: belgeye ait CBS ilişki revizyonu, eski snapshot reddi ve yeniden projeksiyon işi. Test: v2 ilişki kaldırma geldikten sonra gecikmiş v1 ekleme mesajı ilişkiyi yeniden açmamalı. Kesin mekânsal sorgular için mevcut GeoJSON/bounding-box yaklaşımını PostGIS geometry ve uzamsal indeksle tamamlamak.

### R8 — Audit, bütünlük ve işletim kanıtları genişletilmeli

Kanıt: audit hash zinciri ve operations fixity doğrulaması mevcut. Ancak `GetDocumentIntegrityQueryHandler` yalnız kaydedilmiş son sürüm hash/MIME/boyut bilgisini döndürüyor; o çağrıda dosya baytlarını yeniden doğrulamıyor. `AccessAuditFilter` audit yazım hatasını loglayıp isteği sürdürüyor. İncelenen audit migration/deploy kodunda bağımsız dış kök hash sabitleme ve DB düzeyinde append-only koruması bulunamadı.

Tamamlama: “kaydedilen hash” ile “son gerçek bütünlük doğrulaması”nı kullanıcıya ayrı gösterme; son doğrulama zamanı/sonucu. Kritik kayıt işlemlerinde kalıcı audit/outbox, erişim audit kayıplarında alarm/telafi, DB hesabı yetkileri ve bağımsız kanıt sabitleme. Tüm belge yaşam döngüsü olaylarında aktör/gerekçe/önce-sonra kapsamını envanterlemek. Yedekten dönüş ve indeks yeniden kurma tatbikatı kanıtlarını tamamlamak.

## 4. Belediyenin hedef süreç haritası

| Süreç | Hedef davranış | Mevcut durum |
|---|---|---|
| Belge kabulü | Tarama, toplu yükleme, e-posta/EYP/EBYS aktarımı, kaynak kayıt ve teslim bilgisi | Dosya yükleme/worker var; donanım taraması UI'da devrede değil, entegrasyonlar eksik |
| Kalite kontrol | Eksik/çift sayfa, okunabilirlik, mükerrer, OCR güveni, operatör düzeltmesi | İşleme temeli var; tamamlanmış kalite iş kuyruğu yok |
| Tasnif | Onaylı dosya planı, sürümlü şema, belge türü, zorunlu alanlar | Kısmi |
| İş/dava/proje yönetimi | İhale, UKOME, ruhsat, kamulaştırma gibi iş dosyalarında belge+görev+CBS | Business Workspace eksik |
| Aktif kullanım | Yetkili arama, önizleme, sürüm, ilişki, kontrollü dışa aktarma | Kısmi |
| Kayıt beyanı | Kesin sürüm, sınıflandırma, geçerli saklama politikası ve değiştirilemezlik | Temel var; R2/R3 kapanmalı |
| Birimden kurum arşivine devir | Devir listesi, teslim eden/alan, eksik kontrolü, kabul/ret, tutanak | Tam iş akışı yok; fiziksel raf taşıma bunun yerine geçmez |
| Saklama | Dosya kapanışı/yıl sonu/sözleşme bitişi gibi olay tetikleyicileri, politika sürümü | Şimdiki hesap `declaredAt + ay`; gelişmiş cutoff yok |
| Hukuki/idari bloke | Gerekçe, yetkili, belirli hold kimliği, birden çok bloke, kaldırma kanıtı | Hukuki hold temeli var; idari ayrım ve kapsamlı yönetim eksik |
| Ayıklama ve imha | İnceleme, komisyon, onay, son kontroller, yürütme, tutanak | Eksik |
| Kalıcı koruma ve devir | Orijinal+türev+üstveri+ilişki+kanıt paketi, format göçü | Kalıcı saklama seçeneği var; uzun dönem koruma ve paket devri eksik |
| Fiziksel arşiv | Yerleşim, barkod, kapasite, teslim/zimmet/iade, sayım | Gerçek temel mevcut; bütün kurum prosedürleri için saha kabulü gerekli |
| Bilgi/belge talebi | Birime yönlendirme, süre, inceleme, kişisel veri karartma, kontrollü teslim | Tam süreç bulunamadı |
| Kurum entegrasyonları | EBYS/EYP, dizin, CBS, zaman damgası ve gerekiyorsa KEP | Bazı adaptör sınırları var; tamamlanmış bütünleşik akış yok |
| İşletim | İzleme, hata kuyruğu, telafi, yedek/geri dönüş, ölçek ve kapasite | Operations temeli var; üretim kabul kanıtı eksik |

Saklama süresi ve tasfiye kararı belge türüne göre kurumun geçerli/onaylı planından alınmalı; yazılım ekibi rastgele süreler tanımlamamalı. Devlet Arşivleri'nin [Dosya Planı Hazırlama ve Uygulama Rehberi](https://www.devletarsivleri.gov.tr/varliklar/dosyalar/formlar/dosyaplan%C4%B1rehberi1.1.pdf) ve [Devlet Arşiv Hizmetleri Hakkında Yönetmelik metni](https://www.devletarsivleri.gov.tr/varliklar/dosyalar/mevzuat/arsivhizmetleri.pdf) süreç eşlemesinin resmî başlangıç kaynaklarıdır. Belediye için uygulanacak güncel plan ve kurum yönergesi ayrıca sürümüyle doğrulanmalıdır. Bu inceleme bir mevzuat uygunluk belgesi değildir.

## 5. Dünya ürünlerinden alınacak güçlü taraflar

Bu çalışma dünyadaki bütün firmaların eksiksiz envanteri değildir. Dokuz önemli ürün/çözüm ailesinin resmî kaynaklarından belediye kapsamıyla ilgili yetenekler seçilmiştir; lisans/paket/kurulum farkları ayrıca incelenmelidir. Alfresco ve OnBase aynı Hyland portföyündedir.

| Referans | Harmanlanacak yetenek | MBB'deki somut karşılık |
|---|---|---|
| [OpenText Documentum](https://www.opentext.com/products/documentum-content-management) | İçerik yönetişimi, yaşam döngüsü, saklama ve kurumsal entegrasyon | Kayıt politikaları ve belediye iş dosyası |
| [Laserfiche](https://doc.laserfiche.com/laserfiche/en-us/Content/rm-overview.htm) | Kayıt yaşam döngüsü, cutoff ve tasfiye yönetimi | Kullanıcıyı teknik detayla yormayan kayıt akışı |
| [M-Files](https://www.m-files.com/m-files-platform/) | Üstveri, ilişkiler ve bağlama göre çalışma | Belgeyi klasörden bağımsız kişi/birim/proje/karara bağlama |
| [Hyland OnBase](https://www.hyland.com/en/solutions/products/onbase?lang=en) | Çok kanallı kabul, iş akışı ve case management | Belediye başvuru/ihale/ruhsat görev ve onay süreçleri |
| [Alfresco Governance](https://docs.alfresco.com/governance-services/7.2/) | Kayıt, sınıflandırma ve güvenlik kontrollerinin birleşimi | Tek metadata ve erişim politikasıyla tutarlı arşiv |
| [Iron Mountain](https://www.ironmountain.com/services/document-scanning-and-digital-storage) | Fiziksel-dijital kabul, tarama, saklama ve kontrollü tasfiye | Kutu/klasör/evrakın teslimden imhaya izlenmesi |
| [Preservica](https://preservica.com/enterprise-edition) | Uzun dönem erişilebilirlik, format eskimesine karşı koruma | Orijinali koruyarak format göçü, sürekli bütünlük kontrolü |
| [IBM FileNet](https://www.ibm.com/products/filenet-content-manager) | Kurumsal içerik ve içerik asistanı | Kurum sistemleriyle bağlı, kaynağını gösteren bilgi erişimi |
| [Microsoft Purview](https://learn.microsoft.com/en-us/purview/disposition) | Tasfiye incelemesi ve karar süreçleri | İnceleme/onay/tutanak zincirinin izlenebilirliği |

Rakip özelliğini menüye eklemek onu gerçekleştirmek değildir. Her satır için gerçek belge, izin, kalıcılık ve hata senaryosu kabul testi gerekir.

## 6. “Bir adım ötesi” için önerilen fark

**Önerilen ürün odağı: zaman ve mekân bağlantılı, kanıtlanabilir belediye hafızası.** Bunlar bugün tamamlanmış özellikler değil, ölçülebilir geliştirme hedefleridir.

1. **Bir yol/parsel için tarihsel görünüm:** “Bu parsel hakkında 2022 tarihinde hangi karar yürürlükteydi?” sorusunda önceki/sonraki karar, geçerlilik tarihi, proje ve ilgili birim birlikte açılmalı. Güncel CBS geometrisinin yanında tarihsel geometri/kimlik değişimi korunmalı.
2. **Kanıt gösteren Türkçe arama:** sonuç veya yapay zekâ cevabı belge sürümü ve sayfasını göstermeli; belgesiz cevap üretmemeli. Yetki filtresi bütün retrieval aşamasında geçerli olmalı. Belge içerikleri talimat olarak yürütülmemeli.
3. **Eksik evrak ve çelişki denetimi:** ruhsat/ihale dosyasında gerekli belge eksikliği, yürürlükten kalkmış karar, mükerrer belge ve uyumsuz metadata insan incelemesine sunulmalı. Otomatik hukuki karar verilmemeli.
4. **Tek işlemde denetim paketi:** seçili kapsamın dosyaları, metadata, ilişkiler, hash manifesti, zaman bilgileri ve denetim izi dışa aktarılmalı; paket dışarıda da doğrulanabilmeli. Yetki, karartma ve dışa aktarma kaydı birlikte uygulanmalı.
5. **Uzun dönem korunabilirlik:** format riski ve bütünlük bozulması izlenmeli; format göçü orijinali değiştirmeden yeni preservation rendition üretmeli. Her değişim kanıtlanmalı.
6. **Fiziksel-dijital zincirin birliği:** barkoddan hem bulunduğu raf hem dijital sürüm hem de kimde/ne zamandır olduğu görülebilmeli; saha sayımı ve geri teslim uyuşmazlıkları iş kuyruğuna düşmeli.

Üstünlük iddiasının ölçütü “daha çok ekran” olmamalı. Pilot kabul hedefleri önerisi: 1 milyon belge ve 100 eşzamanlı kullanıcı için önceden belirlenmiş sorgu setinde p95 arama süresi ≤2 sn; yetkisiz içerik/başlık/facet sızıntısı 0; beklenen kritik audit olaylarının kapsamı %100; kaynaksız AI cevap yerine açık yetersiz kanıt sonucu. Bunlar **önerilen hedeflerdir, ölçülmüş sonuçlar değildir**; gerçek hacim, donanım ve kurum ihtiyaçlarıyla kesinleştirilmelidir.

## 7. Uygulama sırası ve devir notu

| Sıra | İş paketi | Bitti sayılma koşulu |
|---|---|---|
| 0 | Claude rol/yetki işinin mevcut durumunu sabitleme | Değişen dosyalar/migration'lar ve test sonucu kayıtlı; R4 kapsam testiyle kapanış |
| 1 | Kayıt beyanı, saklama ve kanıt güvencesi | R2/R3/R8 için tekrar teslim, geçersiz politika, storage lock ve audit hata testleri |
| 2 | Belediye devir/ayıklama/komisyon akışı | Bir belge kabulden onaylı devre ve tasfiye kararına kadar ilerliyor; hold bütün uygunsuz geçişleri engelliyor |
| 3 | Gerçek tanımlamalar ve belge türü | API'ye bağlı şema yönetimi; UKOME ve ruhsat formları şemadan üretiliyor; yenilemede veri korunuyor |
| 4 | Türev viewer ve sürüm deneyimi | PDF, TIFF, Office ve e-posta için ilan edilen format matrisi baştan sona geçiyor |
| 5 | Çalışma alanı, ilişkiler ve arama | Karar/proje/birim/CBS ilişkileri; revizyon sırası güvencesi; indeks sıfırdan kurulabiliyor |
| 6 | Kurum entegrasyonu ve uzun dönem koruma | Gerçek EYP/EBYS/provider sözleşmeleri; dışa/içe aktarım; format göçü ve geri dönüş tatbikatı |
| 7 | Fark yaratacak bilgi erişimi ve ölçek | Kaynaklı Türkçe arama, tarihsel CBS, eksik evrak; kabul veri seti ve yük testleri |

Önceki talimatın modüler monolit, mevcut Documents örüntüsü ve mevcut tasarım sistemi korunmalı. Yeni solution veya ikinci UI sistemi kurulmasına gerek yok. Her iş paketi domain + migration + API + UI + yetki + audit + kabul testiyle kapanmalı; sırf endpoint ya da ekran eklendi diye tamamlandı işaretlenmemeli.

Claude'un limiti dolarsa devam edecek geliştirici için ilk adım bu rapordaki 0 ve 1 numaralı paketlerdir. `Organization`, `AccessControl`, Host kimlik altyapısı ve `definitions-manager-view.tsx` içindeki rol alanı yeniden okunmadan paralel değişiklik yapılmamalı. Diğer çalışma tamamlandıktan sonra rapordaki bulgular değişen kodla tekrar karşılaştırılmalı.

## 8. Önceki durum raporunda düzeltilecek ifadeler

- Archive/Evidence ekranı ve Workflow sorgu ucu “yok” yazan bölümler güncel değil: `/kayit-beyani`, `/kanit`, `/gorevlerim` ve ilgili sorgular mevcut.
- Organization “0 dosya” değerlendirmesi güncel değil; inceleme sırasında kod eklenmiş, fakat canlı OpenAPI'de Organization uçları görünmüyordu. Devam eden iş.
- Navigasyon için hem gruplandı hem “düz 12 kalem” deniyor; tek güncel bilgiye indirilmeli.
- WORM, yalnız adaptör eklenmesiyle tamamlandı işaretlenmemeli; R3'teki operasyonel ve politika bağı eksikleri korunmalı.
- CBS tam liste olayının ters sıralamada tutarlı kaldığı iddiası çıkarılmalı veya R7 düzeltmesi ve testle kanıtlanmalı.
- “Viewer tamamlandı” ve “Hal Yolu kabul senaryosunun tamamı geçiyor” ifadeleri, desteklenmeyen türevler ve eksik bağlantılarla birlikte yeniden değerlendirilmelidir.
- Test sayıları bu incelemede 115 backend / 20 web / 12 Python; bunlar devam eden değişikliklerle artabilir.

Bu raporun kapsamı inceleme ve uygulanabilir geliştirme sırasıdır. Listelenen eksik özellikler bu turda uygulanmış olarak sunulmamaktadır.
