# Mevcut Durum Analizi

> Uygulama direktifi PHASE 0 çıktısı. Depo üzerinde yapılan inceleme ve çalışan
> API'ye karşı yapılan doğrulamaların özetidir. Kod değiştikçe güncellenmelidir.
>
> İnceleme tarihi: 2026-09-05

## 1. Çözüm yapısı

`Mbb.Archive.slnx` altında modüler monolit: `src/BuildingBlocks`, `src/Modules`,
`src/Host/Mbb.Archive.Api`, `src/Workers`, `src/Agents`, `web`, `tests`, `deploy`.

- Backend: .NET 10, Minimal API, EF Core, PostgreSQL, transactional outbox
- Frontend: Next.js 16 + React 19, TypeScript strict, feature-based dizin
- Arama: OpenSearch (`mbb-archive-documents-v1`)
- Worker: Python (`ocr_worker`, `pdf_worker`), .NET (`SecurityScan`)
- 13 modülün her biri kendi `Initial*` migration'ına sahip

## 2. Modül olgunluk haritası

Ölçüt: `bin/` hariç `.cs` dosya sayısı ve web arayüzünde kullanım.

| Modül | Kod | HTTP ucu | Web ekranı | Not |
|---|---:|---|---|---|
| Documents | var | `/documents` (süzgeç+sıralama), `/{id}/files`, `/{id}/integrity` | ✅ | Referans bounded context |
| PhysicalArchive | var | konum, klasör, ödünç | ✅ | Doluluk ve zimmet tam |
| Classification | var | dosya planı, üstveri şeması | ✅ | Şema tabanlı üstveri çalışıyor |
| Search | var | `/search/documents`, `/highlights` | ✅ | `highlights` ucu bağlı değil |
| Retention | 41 | `/retention/cases`, `/rules` | ✅ | `/devir-imha` |
| Operations | var | `/operations/overview` | ✅ | Ölçüm kaynağı |
| **Archive** | 38 | `/archive/records/{id}`, `/declare` | ❌ | Kayıt beyanı ekranı yok |
| **Evidence** | 40 | CMS/PAdES doğrulama, zaman damgası | ❌ | Ekran yok |
| **Audit** | 15 | `/audit/events` | ✅ | Hash zincirli; ana sayfa ve belge ayrıntısında |
| **Workflow** | 30 | yalnız komut uçları | ❌ | **Sorgu ucu yok** |
| **OfficialCorrespondence** | 36 | `/eyp/inspect` | ❌ | Ekran yok |
| Sharing | 0 | — | — | Başlanmamış |
| Integrations | 0 | — | — | Başlanmamış |
| Organization | 0 | — | — | Başlanmamış |
| Reporting | 0 | — | — | Başlanmamış |

**En önemli bulgu:** Archive, Evidence, Audit, Workflow ve OfficialCorrespondence
modülleri yazılmış ancak hiçbir ekrana bağlanmamıştır. Ürün vizyonundaki
"değiştirilemez saklama" çekirdeği büyük ölçüde mevcuttur, görünür değildir.

> Bu modüllerin `README.md` dosyaları hâlâ "uygulama kodu henüz başlatılmamıştır"
> demektedir; içerik güncel değildir.

## 3. Ingestion ve bütünlük

Doğrulanmış zincir:

```
POST /documents                      → belge kaydı
POST /documents/{id}/files           → staging + SHA-256, rate limit "uploads"
  → DocumentFileStagedIntegrationEvent (outbox, aynı transaction)
  → SecurityScan worker (ClamAV + imza tespiti)
  → Processing (PDF inceleme / OCR)
  → Search projeksiyonu
```

- `DocumentFileIngestion` istemci MIME'ına güvenmez, gerçek tip worker'da belirlenir
- `ArchiveRecord`: `Candidate → Declared`; beyan için sınıflandırma **ve** saklama
  kuralı zorunlu, SHA-256 64 karakter doğrulanır
- Audit girdileri `PreviousHash`/`EntryHash` ile zincirlenir (canlı: 245 girdi)

### WORM depolama

Depolama içerik adresli olduğundan (anahtar = SHA-256) farklı içerikle üzerine
yazmak zaten mümkün değildir. Buna ek olarak `Documents.OriginalStorage.Worm`
bölümü eklendi:

| Alan | Varsayılan | Etkisi |
|---|---|---|
| `Enabled` | `false` | Kapalıyken davranış eskisiyle aynı |
| `Mode` | `Governance` | S3 Object Lock kipi (`Governance`/`Compliance`) |
| `RetentionDays` | `3650` | Nesnenin silinemez kalacağı süre |

- **S3**: `PutObjectRequest` üzerinde `ObjectLockMode` +
  `ObjectLockRetainUntilDate` ayarlanır. Bucket'ta Object Lock etkin olmalıdır.
- **Local**: dosya salt okunur işaretlenir. Kazara üzerine yazmayı engeller;
  gerçek WORM garantisi değildir, production için S3 Object Lock gerekir.

## 4. Format desteği

`FileSignatureDetector` tanıdığı imzalar ve `ProcessingJob` yönlendirmesi:

| Format | Tespit | İşleme |
|---|---|---|
| PDF | `%PDF-` | PDF inceleme → OCR |
| TIFF / JPEG / PNG | imza | OCR |
| DOCX / XLSX / PPTX | ZIP kabı içindeki `word/`, `xl/`, `ppt/` girdileri | metin çıkarma |
| DOC / XLS / PPT / MSG | OLE Compound File dizin akış adları | metin çıkarma (çıkarıcı henüz yok) |
| TXT / CSV | içerik taraması (kontrol karakteri yoksa metin) | metin çıkarma |
| EML | RFC 822 başlık deseni | metin çıkarma |

`FileSignatureDetector` artık OOXML kabını yalnızca merkezi dizinden okuyarak
ayırt eder — hiçbir giriş açılmaz, dolayısıyla tespit sırasında sıkıştırma
bombası açılmaz (§28). Eski Office formatları için CFB başlığındaki dizin
sektörü okunur.

Yönlendirme `ProcessingStage.TextExtractionRequested` üzerinden Python
`text_worker`'a gider. Worker DOCX/XLSX/PPTX/TXT/CSV/EML için yalnız standart
kütüphane ile metin çıkarır; giriş başına 64 MB, belge başına 256 MB açılma
sınırı uygular.

**Kalan boşluk:** eski ikili Office formatları (DOC/XLS/PPT) ve MSG tanınıyor ve
yönlendiriliyor ancak çıkarıcıları yok; iş `format_not_supported` koduyla açıkça
başarısız olur. Sessizce "Unsupported" kalmaktan farkı, boşluğun operasyon
ekranında görünür olmasıdır.

## 5. Arama

`GET /search/documents` desteği: `q`, `page`, `pageSize`, `mimeType`,
`filePlanCode`, `metadataKey`, `metadataValue`.

- Vurgulama OpenSearch `<mark>` parçalarıyla, sayfa düzeyinde eşleşme ile çalışıyor
- Üstveri anahtarları projeksiyonda `<şema anahtarı>.<alan anahtarı>` biçiminde
  saklanır (örn. `evrak-ustverisi.evrak_no`)
- `geo_shape` alanı ve ilişki bazlı arama yok
- `GET /search/documents/{id}/highlights` (OCR koordinat kutuları) hiçbir yerde
  kullanılmıyor

## 6. Frontend

Mevcut rotalar: `/`, `/arama`, `/arsiv-simulatoru`, `/arsiv-yerlesimi`, `/ayarlar`,
`/devir-imha`, `/documents`, `/documents/[id]`, `/dosya-islemleri`, `/login`,
`/odunc`, `/operations`, `/tanimlamalar`, `/tarama`.

Navigasyon direktif §14 bilgi mimarisine göre yedi gruba ayrılmıştır; ekranı
olmayan kalemler bağlantı değil, `planned` durumunda devre dışı çizilir.
Ana sayfa §15 uyarınca arama odaklı çalışma merkezidir. `/documents` üç panelli
Document Explorer'dır; liste durumunun tamamı sorgu dizesinde tutulduğu için
kayıtlı görünüm özelliği yalnızca bu diziyi saklamayı gerektirir.

- Tasarım sistemi: `components/ui/page.tsx` (`PageHeader`, `Panel`, `EmptyState`,
  `Notice`) + shadcn tabanlı primitive'ler. İkinci bir sistem kurulmamalı.
- `ApiErrorState` bilinçli olarak örnek veriye düşmez.
- Navigasyon düz 12 kalemdir; direktif §14'teki bilgi mimarisiyle uyumlu değildir.

### Temizlenen sahte veri

Bu tur içinde kaldırılan uydurma içerikler:

- Ana sayfa: sabit KPI'lar (`18083`, `83102`, `3072383939461,62 m` vb.)
- Tarama stüdyosu: sabit tarayıcı listesi, `setTimeout` ile sahte ADF taraması,
  boş `.txt` yükleyen fallback, kurgu "Tesseract v5.3 OCR" metni
- Arama: 1499 satırlık, arama API'sini hiç çağırmayan mock stüdyo
- Arşiv simülatörü: sahte kapasiteler, uydurma CBS koordinatı ve yangın telemetrisi

### Düzeltilen gerçek hatalar

- Sınıflandırma çağrısı yanlış sözleşmeyle gidiyordu (`classificationCode` yerine
  `filePlanId`/`filePlanItemId`), her istek 404 dönüp yutuluyordu
- Çok sayfalı tarama yalnız seçili sayfayı yüklüyordu
- Başarısız yükleme uydurma kimlikle "başarılı" raporluyordu

## 7. Yetkilendirme

`Authentication.Enabled = false` (geliştirme). `/access/me` `subject`, `roles`,
`permissions`, `isBootstrapAdministrator` döner. Uçlar
`permission:<alan>.<eylem>` politikalarıyla korunur.

Documents, Classification ve Search grupları daha önce yalnızca
`RequireAuthorization()` kullanıyordu; oturum açan herkes her belgeyi
indirebiliyordu. Bu turda politikalar eklendi:

| Uç | İzin |
|---|---|
| `GET /documents`, `/{id}`, `/{id}/integrity`, `/{id}/versions`, `/{id}/ingestions/{…}` | `documents.read` |
| `GET /documents/{id}/content` | `documents.download` |
| `POST /documents`, `POST /documents/{id}/files` | `documents.write` |
| `GET /documents/outbox` | `documents.operations.read` |
| Dosya planı / şema okuma | `classification.read` |
| Dosya planı / şema yönetimi | `classification.manage` |
| Belge sınıflandırma ve üstveri yazma | `documents.metadata.write` |
| `GET /search/documents…` | `search.read` |

Yerel geliştirmede `Administrators` rolü bootstrap istisnasıyla geçer; üretimde
bu izinlerin rollere atanması gerekir (`POST /access/roles/{id}/permissions`).

## 8. Test ve kalite

14 unit test projesi + `Mbb.Archive.ArchitectureTests`; toplam 87 backend testi.
Bu turda eklenenler: `Mbb.Archive.BuildingBlocks.UnitTests` (erişim denetimi
filtresi), `Mbb.Archive.Worker.SecurityScan.UnitTests` (MIME tespiti),
`Mbb.Archive.Modules.Audit.UnitTests` (yük saklama eşlemesi).

Frontend testi artık var: `vitest` + `@testing-library/react`, `npm test` ile
çalışır (16 test). Python worker'lar için `python3 -m unittest` altında 10 metin
çıkarma testi.

Integration test projesi hâlâ yok.

## 9. Öncelik değerlendirmesi

Direktif fazlarına göre en kritik açıklar:

1. ~~**PHASE 1** — navigasyon ve ana sayfa~~ — tamamlandı
2. ~~**PHASE 2** — Document Explorer~~ — tamamlandı (süzgeç, sıralama, bütünlük paneli)
3. ~~**PHASE 3** — Document Viewer~~ — tamamlandı (7 sekme, OCR metni, sürümler)
4. ~~**§3.1** — WORM depolama~~ — S3 Object Lock + yerel salt okunur eklendi
5. ~~**§3.1/§10** — Office/metin çıkarma~~ — `text_worker` eklendi; DOC/XLS/PPT/MSG
   çıkarıcısı kaldı
6. **PHASE 4** — DocumentType/dinamik şema yönetimi yok
7. ~~**PHASE 6** — CBS/Geo modülü~~ — eklendi, arama entegrasyonu dahil;
   §30 kabul senaryosunun tamamı geçiyor
8. **Görünmez modüller** — Archive ve Evidence hâlâ ekrana bağlanmadı
9. **Workflow** — sorgu ucu olmadan "Görevlerim" yapılamaz
10. **Rendition/preview ucu** — Preview worker türev üretiyor ama sunan uç yok

## 10. Bu turda eklenen uçlar

- `GET /documents` — `search`, `status`, `createdFrom`, `createdTo`, `sort`
  parametreleri eklendi. Parametresiz çağrı eski davranışı korur.
- `GET /documents/{id}/integrity` — güncel sürümün SHA-256, MIME ve boyutu.
  Depolama anahtarı bilinçli olarak dışarı verilmez.
- `GET /documents/{id}/versions` — değişmez sürüm listesi (yeniden eskiye).
- `GET /search/documents/{id}/text` — çıkarılmış/OCR metni. Metin henüz
  üretilmediyse hata değil, `hasText:false` döner.

## 11. Yapılandırma tuzağı

`Search.Artifacts.LocalRootPath` ve `Documents.OriginalStorage.LocalRootPath`
varsayılanları görelidir (`./.local-data/...`) ve süreç çalışma dizinine göre
çözülür. API `dotnet run --project src/Host/Mbb.Archive.Api` ile doğrudan
başlatılırsa çalışma dizini proje klasörü olur ve worker'ların depo kökene
yazdığı artifact'ler bulunamaz; OCR metni ve `highlights` ucu boş/500 döner.
`start.sh` bu yüzden yolları mutlak olarak dışa aktarır — API elle başlatılırken
aynı ortam değişkenleri verilmelidir.

## 12. Denetim günlüğü: yük saklama hatası (düzeltildi)

`audit.entries.payload` sütunu `jsonb` idi. Postgres jsonb'yi normalize eder —
anahtarları uzunluk/bayt sırasına dizer, boşlukları yeniden yazar. Girdi hash'i
ise yayınlanan **ham** bayt dizisi üzerinden hesaplanıyordu. Sonuç: geri okunan
metin hash'lenen metinden farklıydı ve `audit.hash_chain` doğrulaması, anahtar
sırası jsonb normaline uymayan her olay için `hashValid: false` veriyordu.

Canlı veritabanında 248 girdinin 19'u bu nedenle doğrulanamıyordu. §13'ün
istediği değiştirilemez ve **doğrulanabilir** denetim izi fiilen kırıktı.

Düzeltme: sütun `text` yapıldı (`StoreAuditPayloadAsText` göçü). Zincir bağları
(`previous_hash`) hiçbir zaman bozulmamıştı; yalnızca girdi hash'i yeniden
hesaplanamıyordu.

**Geriye dönük sınır:** göçten önce yazılmış satırların baytları jsonb
tarafından zaten değiştirilmişti. `payload::text` dönüşümü normalize edilmiş
hâli metne çevirir, orijinali geri getirmez. Bu 19 satır kalıcı olarak
"mismatch" raporlanacaktır; göçten sonra yazılan girdiler doğrulanır.

## 13. Erişim denetimi (§13)

Denetim günlüğü yalnızca pipeline olaylarını taşıyordu; §13'ün saydığı
görüntüleme, indirme, önizleme ve yetki değişikliği hiç kaydedilmiyordu.
Eklenen olaylar:

| Olay | Tetikleyen |
|---|---|
| `access.document-viewed.v1` | `GET /documents/{id}` |
| `access.document-previewed.v1` | `GET /documents/{id}/content` |
| `access.document-downloaded.v1` | `GET /documents/{id}/content?download=true` |
| `access.permission-changed.v1` | rol oluşturma / izin verme |
| `access.role-assigned.v1` | özneye rol atama |

Kayıt `IAccessAuditor` üzerinden denetim exchange'ine yayınlanır; audit kuyruğu
`#` ile bağlı olduğu için hash zincirli journal'a düşer. Alanlar: özne, IP,
kısaltılmış user agent (256 karakter), korelasyon kimliği ve sonuç
(`succeeded` / `denied` / `failed`). Denetim yazımındaki hata kullanıcı
isteğini düşürmez, loglanır.

## 14. Sürüm künyesi (§5)

`document_versions` tablosuna `created_by` ve `reason` eklendi
(`AddVersionAuthorAndReason` göçü); değerler `file_ingestions.submitted_by` /
`version_reason` üzerinden taşınır. Gerekçe `X-Version-Reason` başlığıyla
gönderilir.

Göçten önce yazılmış sürümlerde `created_by = "unknown"` görünür ve arayüzde
"kayıt öncesi" olarak gösterilir.

Ayrı bir `POST /documents/{id}/versions` ucu **eklenmedi**: var olan
`POST /documents/{id}/files` zaten sürümü olan bir belgeye dosya yüklendiğinde
sürüm 2'yi oluşturur. §25'teki uç listesi örnektir; mevcut convention korundu.

## 15. AMQP timestamp hatası (düzeltildi)

Python worker'ların ortak yayıncısı `timestamp=None` gönderiyordu. Denetim
tüketicisi `occurredAt` alanını AMQP timestamp'inden okuduğu için bu olaylar
journal'a `1970-01-01` olarak yazılıyordu. Yayıncı artık yükün `occurredAt`
alanını, yoksa yayın anını kullanır.

Arayüzdeki `auditEventTimestamp()` geri düşüşü, göç öncesi yazılmış kayıtların
1970 görünmemesi için duruyor.

## 16. PHASE 6 — CBS / Geo modülü

### Neden PostGIS yok

`deploy/compose.infrastructure.yml` `postgres:18-alpine` kullanıyor; bu imajda
PostGIS eklentisi bulunmuyor ve imajı değiştirmek mevcut geliştirme
veritabanının taşınmasını gerektirirdi. Geometri bu yüzden:

- `geojson` — RFC 7946 geometri nesnesi, **metin** olarak (jsonb anahtarları
  yeniden sıralayıp sağlayıcıdan gelen hâli değiştirir),
- `min_longitude` / `min_latitude` / `max_longitude` / `max_latitude` —
  önceden hesaplanmış sınırlayıcı kutu

biçiminde saklanıyor. Harita görünümü sorgusu (`?bbox=`) kutu kesişimiyle
çalışır. **Kesin uzamsal yüklemler (contains, intersects, within) yok**; bunlar
PostGIS gerektirir. Kolon düzeni geçişi engellemiyor: imaj `postgis/postgis`
ile değiştirilip ayrı bir göçle `geometry` sütunu eklenebilir.

### Model

`GeoEntity` yalnız koordinat tutmaz; sağlayıcı katmanındaki kalıcı feature
kimliğini saklar (§9). `(provider, layer_name, feature_id)` benzersizdir, bu
yüzden aynı nesne ikinci kez içe aktarıldığında kopya oluşmaz, mevcut kayıt
tazelenir.

`DocumentGeoRelation` çok-a-çok ve **tiplidir** (`Subject`, `Mentions`,
`AffectedArea`, `Location`) — serbest etiket değil. Zaman aralığı taşır:
bir kararın yürürlüğü bittiğinde ilişki silinmez, `valid_to` yazılarak
kapatılır. Hangi kararın hangi dönemde hangi nesneyi etkilediği kayıtta kalır.

### Sağlayıcı

`IGeoFeatureProvider` portu ve OGC WFS 2.0 adaptörü. Adres ve kimlik bilgileri
yalnızca `Geo:Wfs:*` üzerinden, yani environment/secret'tan gelir; kaynak kodda
hiçbir varsayılan yok. Yapılandırılmamış sağlayıcı **sessizce boş liste
döndürmez**, `geo.provider_not_configured` hatası verir — eksik entegrasyon
ekranda "veri yok" gibi görünmez.

Harita altlığı da aynı mantıkta: `Geo:Basemap:TileUrl` boşken arayüz hiçbir dış
servise istek atmaz, geometrileri nötr zemine çizer ve eksikliği bildirir.

### Uçlar

| Uç | İzin |
|---|---|
| `GET /geo/settings`, `/layers`, `/entities`, `/entities/{id}` | `geo.read` |
| `GET /geo/entities/{id}/documents` (harita → belge) | `geo.read` |
| `GET /geo/documents/{id}/relations` (belge → harita) | `geo.read` |
| `GET /geo/features/search` (sağlayıcı geçişi) | `geo.read` |
| `POST /geo/entities` | `geo.manage` |
| `POST`/`DELETE /geo/documents/{id}/relations` | `geo.manage` |

İlişki kurma ve kapatma `access.geo-relation-created.v1` /
`access.geo-relation-closed.v1` olaylarıyla denetim günlüğüne düşer.

### §30 Hal Yolu senaryosu — durum

| Adım | Durum |
|---|---|
| 1–8 yükleme, SHA-256, depolama, OCR, indeksleme | çalışıyor |
| 9–11 harita sekmesi, Hal Yolu seçimi, ilişki oluşumu | çalışıyor |
| 14 haritada Hal Yolu → aynı belge | çalışıyor |
| 15 görüntüleyicide künye/OCR/harita/ilişki/denetim | çalışıyor |
| 16–17 orijinal değiştirilemez, düzeltme yeni sürüm | çalışıyor |
| 12–13 "Hal Yolu" araması belgeyi getirir ve nedenini gösterir | çalışıyor |

### Arama entegrasyonu

`geo.document-relations-changed.v1` olayı belgenin **aktif ilişkilerinin
tamamını** taşır — fark değil bütün küme. Tüketici listeyi olduğu gibi
değiştirir, böylece olay sırası bozulsa da projeksiyon tutarlı kalır.

- Geo modülüne transactional outbox eklendi (`geo.outbox_messages`); ilişki
  kaydedilip olayın kaybolması mümkün değil.
- Arama projeksiyonuna `geo_json` sütunu, OpenSearch eşlemesine `geoEntities`
  nested alanı eklendi.
- İndeks `dynamic: strict` olduğu için mevcut indekse alan eklemek gerekiyordu;
  `EnsureIndexAsync` artık indeks varsa eşlemeyi bir kez günceller. Alan ekleme
  eklemeli bir işlem, yeniden indeksleme gerektirmiyor.
- Sorguda coğrafi ad `boost: 8` ile aranıyor: küratörlü bir CBS ilişkisi,
  bulanık metin eşleşmesinden daha güçlü bir sinyaldir.
- `inner_hits` ile hangi nesnenin eşleştiği sonuca ekleniyor; arama ekranı
  "Harita ilişkisi: Hal Yolu · Konusu" satırını gösteriyor (§30 adım 13).

Canlı doğrulama: `q=Hal Yolu` → ilgili belge 2.93 skorla **birinci sırada**,
neden olarak `metin | 1 sayfa | CBS: Hal Yolu (Subject)`.

### Örnek veri

`scripts/seed_geo_entities.py` Hal Yolu, Hal Yolu Kavşağı, Yeşilyurt ve
Battalgazi nesnelerini yerel kataloğa yükler. Yeniden çalıştırılabilir; aynı
feature kimliği kopya üretmez.

## 16. Birim bazlı yetkilendirme (Faz 1–3)

Sorun: Bilgi İşlem'in evrakını İnsan Kaynakları görmemeli, ama yetki verilen
kişiler birim sınırını aşabilmeli. Üç katman kuruldu; ilk üç faz tamamlandı.

### Organization modülü

Boş duran klasör dolduruldu. Hiyerarşi **materyalize yol** ile tutulur
(`/MBB/GS/BID/BID-YAZ/`): bir birimin altındaki her şeyi bulmak tek önek
eşleşmesidir, özyinelemeli CTE veya kapanış tablosu gerekmez. Baştaki ve
sondaki ayraç, `/MBB/GS/BID/` kapsamının `/MBB/GS/BIDESTEK/` birimini
yakalamasını engeller.

`scripts/seed_organization.py` gerçek MBB teşkilat şemasını yükler (29 birim:
Genel Sekreterlik → daire başkanlıkları → şube müdürlükleri). Tanımlamalar
ekranındaki sabit liste tedarikçi firmanın şirket yapısıydı; bu onun yerine
geçer.

Çoklu üyelik desteklenir (vekâlet), biri birincildir ve yüklenen belgenin
sahibi birimini belirler.

### Kapsam süzgeci

Yüklem tek yerde tanımlıdır (`DocumentAccessFilter`) ve liste, tekil erişim,
içerik indirme ve arama aynı kuralı kullanır. Sorguya gömülür — sonradan
süzmek sayfalamayı ve toplam sayıyı bozardı.

| Uç | Sonuç |
|---|---|
| `GET /documents` | Yalnız kapsamdaki belgeler, doğru toplam sayı |
| `GET /documents/{id}` | Kapsam dışı → 404 (yasak/yok ayrımı sızmaz) |
| `GET /documents/{id}/content` | Kapsam dışı → 404 |
| `GET /documents/{id}/integrity` | Kapsam dışı → 404 |
| `GET /search/documents` | OpenSearch sorgusunda zorunlu `filter` |

Canlı doğrulama: 19 belgeli arşivde yalnız İK/Özlük üyesi bir özne **1 belge**
görüyor; BID belgesine doğrudan bağlantı 404, arama `Sunucu`/`Bakim`/`Malatya`
için **0 sonuç** döndürüyor.

### Yol boyunca bulunan üç hata

1. **Kapsam üstü kullanıcı sahipsiz belge üretiyordu.** Sınırsız okuma yetkisi
   sahiplikle karıştırılmıştı; yönetici yüklediğinde belge hiçbir birime
   bağlanmıyordu. Üyelik artık izinden bağımsız okunuyor.
2. **`bool_` yer tutucusu kapsam süzgecinde değiştirilmiyordu.** Anonim tipte
   `bool` ayrılmış sözcük olduğu için yer tutucu kullanılıyor ve sonda tek bir
   `Replace` ile düzeltiliyordu; benim eklediğim iç içe filtre bu düzeltmenin
   dışında kalıyor ve OpenSearch 400 dönüyordu — yani süzgeç **sessizce
   çalışmıyordu**. Sözlük anahtarına geçildi, yer tutucuya ihtiyaç kalmadı.
3. **Bootstrap istisnası yapılandırmadan kapatılamıyordu.**
   `ArchiveAuthenticationOptions.DevelopmentRoles` C# varsayılanı
   `["Administrators"]` olduğu için binder diziye *ekliyor*, kaldırmıyordu.
   Varsayılan boşaltıldı; değer artık yalnız appsettings'ten gelir.

### Geri doldurma

`scripts/backfill_document_units.py` varsayılan olarak hiçbir şey yazmaz,
rapor üretir. `--apply` ile sahipsiz belgeleri `KARANTINA` birimine bağlar;
orayı yalnız `documents.read.all` izni olanlar görür. Geliştirme veritabanında
17 belge karantinaya alındı.

Sahibi olmayan belge kimseye görünmez — bu bilinçli bir karardır: birimi
belirsiz bir belgenin sessizce herkese açılması, gizlenmesinden daha kötüdür.

### LDAP

`Directory:Ldap` bölümü eklendi; adres, servis hesabı ve parola yalnız
environment'tan gelir, varsayılanlar boştur ve boşken bağlayıcı devre dışıdır.
`LdapDirectoryClient` yalnızca **okur** — parola doğrulaması yapmaz, kimlik
doğrulama OIDC'de kalır ve parola arşiv API'sinden hiç geçmez. Süzgeç
enjeksiyonuna karşı RFC 4515 kaçışı uygulanır.

`DirectorySyncService` birim ağacını ve kullanıcı üyeliklerini eşitler. Elle
verilmiş üyelikler korunur: eşitleme yalnız kendi yazdığı (`Directory`
kaynaklı) kayıtları yönetir, aksi hâlde operatörün bilinçli verdiği vekâleti
sessizce silerdi.

### Kalan fazlar

- **Faz 4 — Paylaşım:** `AccessGrant` (kaynak × özne × izin × süre).
  `AccessScope` alanları hazır (`GrantedDocumentIds`, `GrantedFilePlanCodes`),
  şu an boş geliyor.
- **Faz 5 — Yönetim ekranları:** birim ağacı, grup eşlemesi, paylaşım yönetimi
  ve "bu kullanıcı neleri görüyor" raporu.
- Fiziksel arşiv, ödünç, koleksiyon ve arşiv kaydı uçları henüz kapsam
  süzgecine bağlanmadı.

## 17. Web oturum akışı (OIDC)

Bu tura kadar arayüzün oturumu yoktu: API `Security:Authentication:Enabled`
açıldığında web tarafı jeton taşımadığı için her istek 401 dönerdi.

Eklenenler (`web/`):

| Dosya | İş |
| --- | --- |
| `src/lib/auth/oidc.ts` | Keşif belgesi, PKCE (S256), kod↔jeton değişimi, yenileme, çıkış adresi |
| `src/lib/auth/session.ts` | AES-GCM ile şifrelenmiş httpOnly oturum çerezi, jeton yenileme |
| `src/lib/auth/return-to.ts` | Açık yönlendirme koruması |
| `src/app/api/auth/{login,callback,logout}/route.ts` | Yetkilendirme kodu akışı |
| `src/proxy.ts` | Oturumsuz isteği girişe yollar (Next 16'da `middleware` → `proxy`) |
| `src/app/login/page.tsx` | "Kurum hesabıyla giriş" |

`OIDC_ISSUER` ve `OIDC_CLIENT_ID` boşken kimlik doğrulama **kapalıdır** ve
uygulama bugünkü gibi API'nin geliştirme kimliğiyle çalışır. Adres, istemci
sırrı ve `AUTH_SECRET` yalnız environment'tan gelir; kaynak kodda boştur (§0.11).

### Tarayıcı→API doğrudan çağrıları kapatıldı

Oturum jetonu httpOnly çerezdedir ve tarayıcıya inmez. Bu yüzden API'ye
doğrudan giden dört yol Next sunucusundaki uçlara taşındı:

| Eski | Yeni |
| --- | --- |
| `fetch(API/geo/entities/{id}/documents)` | `/api/geo/entities/[id]/documents` |
| `documentContentUrl()` → `API/documents/{id}/content` | `/api/documents/[id]/content` (Range başlığı iletilir) |
| `stageDocumentFile()` → `API/documents/{id}/files` | `/api/documents/[id]/files` (gövde akış olarak geçer) |
| Devir-imha tutanağı: gelen `authorization` başlığını iletiyordu | Oturumdan alınan jeton |

Son satır sessiz bir hataydı: tarayıcı o isteğe `Authorization` başlığı koymaz,
dolayısıyla iletilen başlık her zaman boştu.

`getPublicApiBaseUrl()` kaldırıldı — API adresi artık istemci paketine hiç
düşmüyor.

### Pano artık 403'e dayanıklı

`whenPermitted(...)` yalnız **403**'ü boş değere düşürür; 500 ve ağ hatası
olduğu gibi yükselir (§33: kesinti "veri yok" gibi görünmemeli). Öncesinde,
`physicalarchive.read` izni olmayan bir kullanıcı ana sayfada 500 alıyordu.

## 18. Kayıt beyanı listesi kapsam süzgeci

`GET /api/v1/archive/records` süzgeçsizdi: başka birimin belge kimliğini,
SHA-256 özetini ve sınıflandırmasını sızdırıyordu.

`archive.records` tablosuna `owner_unit_path` denormalize edildi (Documents ve
Search'te zaten kullanılan desen). Değer `documents.original-stored.v1` olayıyla
taşınır; `ArchiveRecordAccessFilter` yüklemi liste ve tekil erişime **sorgu
içinde** uygulanır, sonradan süzülmez — sonradan süzmek toplam sayıyı sızdırır.

Mevcut kayıtlar için: `scripts/backfill_archive_record_units.py` (varsayılan
olarak yalnız raporlar, `--apply` ile yazar). Doldurulmamış kayıt kapsamlı
kullanıcıya **görünmez**; sessizce herkese açılmasındansa doğrusu budur.

Canlı doğrulama (İK/Özlük kapsamlı kullanıcı, BID'e ait 5 kayıt):

```
kayıt listesi          → toplam 0
tekil kayıt GET        → 404          (403 değil: varlığı sızdırmaz)
BID üyeliği eklenince  → toplam 5, tekil GET 200
```

`GET /physical-archive/folders` ve ödünç/doluluk sorguları zaten
`VisibleFolders()` üzerinden süzülüyordu; ek bir açık bulunmadı.

## 19. Faz 5 — yönetim ekranları

| Ekran | Yol | Durum |
| --- | --- | --- |
| Birim ağacı, üyelikler, SDP eşleştirmesi | `/tanimlamalar/birimler` | Vardı |
| Roller ve izinler | `/tanimlamalar/yetkiler` | Vardı |
| Paylaşım yönetimi | `/tanimlamalar/paylasimlar` | **Yeni** |
| Kullanıcı görünürlüğü raporu | `/tanimlamalar/gorunurluk` | **Yeni** |

Görünürlük raporu için yeni uç: `GET /api/v1/access/visibility/{subjectId}`
(`permission:access.grants.read`). Birim üyeliklerini, rol izinlerini ve
paylaşımları tek yerde birleştirir.

İki dürüstlük notu rapora yazılıdır:

- **Dizin grupları çözülemez.** Grup üyeliği yalnız kullanıcının kendi oturum
  jetonunda bulunur; grup üzerinden verilmiş paylaşımlar raporda görünmez ama
  kullanıcı onları yine de görür.
- **Geliştirme kimliği.** Geliştirme rolü tüm izinleri karşılar ve
  veritabanında durmaz; rapor bunu söylemezse her şeyi gören bir hesap için
  "hiçbir şey görmüyor" diyebilir.

Kaldırılan paylaşım **silinmez**, kapatılır (`validTo` damgalanır, `isActive`
false olur) ve görünürlük hesabına girmez.

### Tanımlamalar ekranı mock veri taraması

Önceki turda bildirilen sabit diziler (satıcı birimleri, örnek kullanıcı
adları, kaynak kodda FTP adresi) artık yok: `/tanimlamalar/birimler`
`/organization/units` ve `/organization/units/{id}/members` uçlarını,
`/tanimlamalar/yetkiler` ise `/access/roles` ucunu okuyor.
