# Dinamik veri ve menü incelemesi — 5 Eylül 2026

## Sonuç ve kapsam

20 ana menünün tamamı ve 5 ek yönetim sayfası HTTP üzerinden kontrol edildi.
Sonuç dosyası: `2026-09-05-dynamic-review-results.json`.
Bu çalışma öncesindeki geniş, commit edilmemiş geliştirmeler korundu; rapor
bu turdaki temizlik ve bağlantıları kapsar.

## Bulgular ve uygulanan değişiklikler

| Ekran | Bulgu | Uygulanan davranış |
|---|---|---|
| Dosyalar | Sabit seri ağacı, demo evrak türleri ve yalnız bildirim gösteren işlemler | Gerçek dosya planı düğümleri, sunucu filtreleri/sayfalama, dosya içerikleri, konum taşıma, CSV, klasöre bağlı tarama |
| Tanımlamalar | Kurgu birimler, kullanıcılar, roller, FTP, etiketler ve seri listesi | API'ye bağlı dosya planları, birim oluşturma/düzenleme/pasifleştirme, şema/sürüm/alan/yayınlama, rol/izin/atama |
| Dosya planı | API hatasını `fp-*`/`node-*` kimliğiyle başarılı sayma, sunucuda olmayan silme | API hatası kullanıcıya ulaşır; gerçek oluşturma/ekleme. Tarihsel plan silme taklidi kaldırıldı |
| Koleksiyonlar | Düzenleme/paylaşımı sonlandırma kontrolü yok | Liste ve ayrıntıda ad/açıklama/paylaşım düzenleme; mevcut backend sahiplik denetimi korunur |
| Harita | Yapılandırma eksik, bağlantının nereden yapılacağı belirsiz | Ayarlar > CBS/WFS yönlendirmesi; etkin durum, ortam anahtarları, katman testi, WFS arama ve sağlayıcıdan doğrulanarak içe alma |
| Harita verileri | Eski betikteki dört temsili geometri gerçek katalogda | Tam feature kimliği/ad/referans/geometri eşleşmesi doğrulandı; aktif ilişkileri kapatılıp nesneler pasifleştirildi; geçmiş ve geri dönüş verisi korundu |
| Tarama | Yalnız dosya/kamera girişi, ScanAgent yalnız README | Python eSCL köprüsü ve tarama ekranında cihaz bağlantısı; gelen sayfalar otomatik önizleme/indeksleme alanına alınır |
| Komisyon/devir | İşlem yokken başlangıç yolu görünmüyor | Yeni değerlendirme aksiyonu, saklama dosyası seçimi, kayıt beyanına yönlendirme; mevcut onay/komisyon/kabul alanları korunur |
| Ödünç | Boş API sonucuna demo zimmetler; hata durumunda uydurma kimlik; yerel sahte iade/devir/uzatma | Gerçek ödünç verme/iade, API listesi, CSV; sahte işlem ve tutanak bileşenleri kaldırıldı |
| Ayarlar/raporlar | Sabit kişi/sayı/tarih, CSV/XLSX indirmeden başarı bildirimi | Raporlama ayrı navbar grubu; PostgreSQL'de kullanıcı/olay/tarih bazlı toplama, gerçek CSV ve denetim ayrıntısına geçiş |
| Denetim | Aktör/hedef/sonuç/IP/iz bilgisi API çıktısında yok | Dar ve tipli denetim bağlamı; kullanıcı/tarih/hedef/olay filtreleri, imleçle eski kayıtlara erişim; belge ayrıntısında da aktör bilgisi |
| Erişim günlüğü | Broker erişilemezse erişim olayını kaybetme riski | Audit modülünün aynı advisory lock/hash zinciriyle doğrudan kalıcı yazımı; reddedilen erişimler ve genel kaynak okumaları da kaydedilir |
| Giriş | Zamanlayıcıyla sahte LDAP/e-Devlet/e-imza başarısı | Gerçek API oturum durumu; geliştirme kimliği açıkça belirtilir |

Test dosyalarındaki kontrollü taklitler üretim verisi değildir ve korunur.
Eski `seed_geo_entities.py` kaldırıldı. `seed_metadata_schemas.py` sahte belge
üretmez; isteğe bağlı şema kurulumudur. Yeni şemalar arayüzden de oluşturulabilir.

## “Seriler” kararı

Seri arşivcilikte geçerli bir kavramdır; ortak işlev, faaliyet veya konu sonucu
oluşan dosya/belge grubunu ifade eder. Bu ekranın dayandığı model ise fiziksel
klasörlerin dosya planı kodlarına göre filtrelenmesidir. Bu yüzden arayüzde
**Dosya planına göre filtrele** ve **Dosya planları** kullanıldı. Gerçek bir fon /
alt fon / seri tanımlama modeli varmış gibi gösterilmedi.

Kaynaklar:
- [Devlet Arşivleri tasnif rehberi](https://www.devletarsivleri.gov.tr/varliklar/dosyalar/eskisiteden/yayinlar/genel-mudurluk-yayinlar/tsanif_islemleri_rehberi.pdf)
- [SAA seri tanımı](https://www2.archivists.org/glossary/citation/series1-file-units-or-documents-arranged-in-accordance-with-a-filing-system-or-mai)

## Ürün referansları

[Preservica'nın yönetim ve güvenlik yaklaşımındaki](https://preservica.com/features/admin-and-security)
koleksiyon yönetimi, kapsamlı denetim ve işlevlere göre raporlama;
[OpenText Capture'ın](https://www.opentext.com/products/capture)
yakalama, sınıflandırma ve doğrulama akışı yönlendirici referanslar olarak
incelendi. Bu çalışma bu ürünlerle özellik veya sertifikasyon eşitliği iddiası değildir.

## Bağlantı kurulumu

- WFS: **Ayarlar > CBS/WFS bağlantısı**. API'nin `Geo:Wfs` yapılandırmasını
  yönetin; sırlar ortam/secret üzerinde kalır. `start.sh` Compose `.env`
  dosyasındaki WFS alanlarını API'ye kendiliğinden yüklemez; aynı terminalde
  export veya API appsettings.Development.json gerekir.
- WFS katmanları yapılandırıldıktan sonra bağlantı testi, katmanda ada göre
  arama ve **Kataloğa al** çalışır. `GetFeature` sunucuda yeniden çağrılır;
  istemcinin gönderdiği bir geometri “WFS kaynağı” sayılmaz.
- Ağ tarama: `src/Agents/Mbb.Archive.ScanAgent/README.md` ve
  **Tarama ve İndeksleme > Ağ Tarayıcısından Al**. Cihaz URL'si yerel
  köprüde yapılandırılır; token/Origin/Host kontrolü, aktarım sınırları ve
  streaming uygulanır. Alınan sayfalar mevcut karantina/AV/OCR hattına girer.
- [GeoServer WFS referansı](https://docs.geoserver.org/main/en/user/services/wfs/reference/)
- [OpenPrinting eSCL sözleşmeleri](https://github.com/OpenPrinting/go-mfp/tree/master/proto/escl)

## Veritabanı ve geri dönüş

- `InitialOrganization`: var olan fakat Host'a bağlanmamış Organization
  modülünü etkinleştirmek için eklemeli migration. Yerel DB'ye uygulandı.
- `AddGeoEntityActiveState`: coğrafi nesneler için geri alınabilir aktif/pasif
  durumu. Aktif ilişkisi olan nesne pasifleştirilemez. İlişki oluşturma da
  nesnenin concurrency sürümünü değiştirir. Yerel DB'ye uygulandı.
- Örnek coğrafya öncesi yedek:
  `.local-data/review/demo-geo-before-retirement.json`.
  `POST /geo/entities/{id}/active` ile tekrar etkinleştirilebilir.
  Kapatılan ilişkiler tarihçe olarak kalır; yeniden bağlama yeni bir ilişki
  oluşturur. Arşiv belgeleri silinmedi.
- Geçici koleksiyon testinde belge yoktu ve test sonunda koleksiyon kaldırıldı.
- Komisyon entegrasyon testleri `mbb_archive_review_tests_20260905` adlı ayrı
  PostgreSQL veritabanında çalıştı.

## Doğrulama sonuçları

| Kontrol | Sonuç |
|---|---|
| .NET çözüm derlemesi | Başarılı; 0 uyarı, 0 hata |
| Backend testleri | 151 geçti; 0 atlandı; ayrı PostgreSQL üzerindeki 3 komisyon entegrasyon testi dahil |
| Arayüz testleri | 27 geçti |
| Next.js üretim derlemesi | Başarılı |
| Yerel eSCL sözleşme testleri | 5 geçti; fiziksel cihaz testi değildir |
| Mimari kontrol ve diff boşluk kontrolü | Başarılı |
| HTTP SSR rota kontrolü | 20 ana menü + 5 ek sayfa: HTTP 200, hata göstergesi yok |
| Canlı koleksiyon | Düzenleme, paylaşma, paylaşımı sonlandırma doğrulandı |
| Canlı denetim | Belge görüntüleme, aktör filtresi, genel kaynak okuması doğrulandı |
| Yeni denetim hash zinciri | İncelenen 14 yeni kayıtta 0 hash uyuşmazlığı, 0 zincir kopması |
| Son API sağlık kontrolü | Healthy; PostgreSQL, RabbitMQ, OpenSearch ve dosya deposu sağlıklı |

Yerel arayüz: http://localhost:3000. API: http://localhost:5080.
Makine okunabilir kanıtlar `2026-09-05-dynamic-review-results.json` dosyasındadır.

## Doğrulama sınırları

- CUA bu oturumda kullanılabilir tarayıcı bulamadı. Görsel/tıklamalı uçtan uca
  tarayıcı testi yapılmış sayılmaz; rota kontrolü gerçek SSR HTTP yanıtıdır.
- Gerçek WFS URL'si ve cihaz marka/model/IP'si sağlanmadı. WFS ve fiziksel
  cihaz bağlantısı henüz doğrulanmış değildir. Tarama için 5 yerel eSCL
  sözleşme/erişim/boyut testi; WFS için hatalı yanıt, kalıcı kimlik ve sorgu
  koruma testleri vardır. TWAIN/WIA/WSD adaptörü bu turda uygulanmadı.
- Ortam Development kimliği kullanıyor. İstekler bu ortak kimlikle kaydolur;
  gerçek kişi bazlı oturum için kurum OIDC/JWT ve web oturum entegrasyonu gerekir.
  IP alanı API'nin gördüğü bağlantı IP'sidir; sunucu üzerinden gelen istekte
  proxy/Next.js adresi olabilir.
- Geçmiş hash uyuşmazlıkları bu turdaki yeni kayıt doğrulamasıyla düzelmiş
  sayılmaz. Önceki jsonb normalizasyonunun kaybettiği ham baytlar geri üretilemez.
- Genel erişim günlüğünün veritabanına yazılması başarısız olursa hata sunucu
  günlüğüne yazılır. Bu durum için mutlak kayıpsız denetim garantisi verilmez.
- Kayıt/kanıt/devir menülerinin açılması; mevzuat uygunluğu, üretim WORM,
  resmi imza doğrulaması, afet kurtarma veya gerçek cihaz kabul testi yerine geçmez.
- Canlı arama indeksindeki eski demo ilişki adları, Geo outbox mesajı işlendikten
  sonra kaldırılır; asıl kaynak korunmuş belge ilişki geçmişidir.
