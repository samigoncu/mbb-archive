# Menü ve süreç denetimi — 10 Eylül 2026

Denetim yerel MBB Archive ortamında yapıldı. Mevcut çalışma ağacındaki önceki değişiklikler korunmuştur. Tüm statik sayfalar kapsam içine alındı; dinamik sayfalar için mevcut bağlantılardan örnekler kontrol edildi. HTTP 200 sonucu, bir ekranın tüm düğmelerinin uçtan uca doğrulandığı anlamına gelmez.

## Sonuçlar

| Kontrol | Sonuç |
|---|---|
| Web otomatik testleri | 57 dosyada 193 başarılı, 0 başarısız |
| .NET birim ve entegrasyon testleri | 311 başarılı, 0 başarısız, 0 atlanan |
| PostgreSQL testleri | Bu çalışmaya özel boş test veritabanlarında gerçek migrasyon, yazma, okuma ve çakışma senaryoları çalıştırıldı; veritabanları kaldırıldı |
| OpenSearch testleri | Benzersiz test indekslerinde Türkçe önek araması ve kapsam/sonuç/facet kontrolleri çalıştırıldı; test indeksleri kaldırıldı |
| Sayfa ve bağlantı taraması | 30 statik sayfa + 150 bağlantı örneği, toplam 180 HTTP 200 |
| API yetki karşılaştırması | 19 okuma ucu: yönetici 200, izinsiz kullanıcı 403 |
| Boş/geçersiz işlem isteği | 14 uçta 4xx; son durumda 500 veya başarılı kayıt oluşturma yok |
| Derleme | API ve Next.js üretim derlemeleri başarılı |
| Tip ve mimari kontrolleri | TypeScript, verify_architecture.py ve git diff --check başarılı |
| Tarayıcı görsel testi | Kullanılabilir tarayıcı yok; gerçekleştirilmedi |

## Bulunan ve düzeltilen hatalar

1. **Koleksiyona olmayan veya görünmeyen belge eklenmesi.** Önceki API rastgele belge kimliği için 204 dönüyordu. Komut artık IDocumentVisibility üzerinden belgenin erişilebilirliğini doğruluyor; görünmeyen/bulunamayan belge için 404 dönüyor ve kayıt yazmıyor. Geçerli belge ekleme ile reddetme için iki komut testi eklendi. Canlı geçersiz belge testi önce 204, düzeltme sonrası 404 verdi; geçici koleksiyon kaldırıldı.
2. **Birim oluştururken boş kod/ad için 500.** Veritabanı sorgusu alan doğrulamasından önce çalışıyor ve null kod üzerinde hata oluşuyordu. Komut girişinde doğrulama eklendi. Canlı boş istek artık 400; regresyon testi var.
3. **Kök/alt arşiv konumu oluştururken boş alanlar.** Konum kodu/barkodu veritabanına gitmeden önce kontrol edilmiyordu. Kök ve alt konum komutlarına zorunlu kod, ad ve barkod kontrolü eklendi. Canlı kök konum testi önce 500, şimdi 400. İki komut regresyonu eklendi.
4. **Eski iade isteğinin yeni zimmeti etkilemesi.** İade edilmiş ödünç kaydı tekrar işlendiğinde dosyanın güncel durumu değiştirilebiliyordu. Yetki kontrolünden sonra zaten iade edilmiş kayıt etkisiz başarıyla sonlanıyor. İzole PostgreSQL testinde ödünç verme → yinelenen ödüncü reddetme → iade → yeniden ödünç verme → eski iadeyi tekrar gönderme → yeni zimmeti koruma → yeni iade zinciri geçti.

## Menü bazında kapsam

Her satırdaki HTTP kontrolü yukarıdaki sayfa taramasına dahildir. Otomatik testler uygulama/komut/model veya bileşen seviyesindedir; tarayıcı tıklama otomasyonu değildir.

| Menü / sayfalar | Kontrol edilen süreç veya kanıt | Sınır |
|---|---|---|
| Ana sayfa | HTTP, iç bağlantılar ve mevcut web regresyonları | Görsel hizalama doğrulanmadı |
| Tüm Belgeler, belge detayı | Liste/filtre/sayfalama, sürüm seçimi, dosyalama, birim kapsamı, iptal ve sürüm iptali testleri; API 200/403 | Her mevcut belgenin dosya içeriği ayrı ayrı açılmadı |
| Tarama ve İndeksleme | Yükleme politikası, gruplama, ayraç, tekrar deneme, kapsam değişimi, güvenlik işçisi testleri | Gerçek tarayıcı cihazı/kamera ve yeni büyük dosya ile uçtan uca OCR bu denetimde denenmedi |
| İşlem Takibi | İşlem modeli, kapsamlı sorgu ve izleme entegrasyonları; API 200/403 | Her harici OCR servis durumuna hata enjeksiyonu yapılmadı |
| Fiziksel dosyalar ve detay | Belge ilişkilendirme, birim sınırı, dosya taşıma, sahiplik ve sayfalama testleri | Gerçek arşivde taşıma yapılmadı |
| Ödünç / zimmet | Gerçek veritabanında yeni tam yaşam döngüsü ve eski iade regresyonu; API 200/403 | Gerçek personele zimmet oluşturulmadı |
| Arşiv yerleşimi / simülatör | Konum alan doğrulaması, taşıma, kapasite/konum modelleri, HTTP | Fiziksel dolap/raf doğruluğu sahada kontrol edilmedi |
| Genel Arama / Keşfet | Form, tarih, koşullar, Türkçe arama, vurgular, izole OpenSearch kapsam ve facet testleri | Tüm doğal dil sorguları destekleniyor iddiası yok |
| Koleksiyonlar / detay | Oluşturma, listeleme, belge ekleme/çıkarma bileşen/action testleri; görünmez belge için yeni komut testleri ve canlı 404 | Koleksiyon paylaşımı belge erişim yetkisini genişletmez |
| Görevlerim | Atama ve tamamlama komutları, form regresyonları, mine API 200/403 | LDAP personel senkronizasyonu ve bildirim gönderimi yok |
| Saklama ve İmha | Durum geçişleri, hukuki bekletme, saklama kuralı ve kapsam testleri | Gerçek arşivde imha yürütülmedi |
| Komisyon / Devir, işlem ve dosya detayları | İnceleme, onay, teslim alma, çift açık işlem engeli, çakışmada geri alma ve outbox bütünlüğü testleri | Harici arşive gerçek paket teslimi yapılmadı |
| Kayıt Beyanı | Beyan komutları/saklama zinciri testleri; kayıt API 200/403 | Gerçek belgeyi geri alınamaz biçimde beyan etme yapılmadı |
| Kanıt ve İmza | CMS/zaman damgası/PDF uçlarında boş girdi reddi, mevcut kanıt testleri, yetki kontrolü | Onaylı PAdES ve TSA entegrasyonu tamamlanmadan tam imza uygunluğu doğrulanamaz |
| Harita | Sayfa, coğrafi model/regresyon testleri, bağlantılar | WFS sağlayıcısı yapılandırılmamış |
| Kullanıcı ve Yetki Yönetimi | Rol/izin ve kullanıcı ataması testleri, menü yetkisi, canlı yönetici/izinsiz kullanıcı karşılaştırması | Kullanıcı dizini/LDAP hâlâ bağlantı bekliyor; kişi bazında ayrı izin override modeli yok, izinler rollerden gelir |
| Birimler ve üyelikler | Gerçek veritabanı üyelik/SDP/sahiplik testleri; boş oluşturma düzeltmesi | LDAP birim eşitlemesi yok |
| Dosya planları / üstveri | HTTP, filtre/model testleri, boş oluşturma reddi, dosyalama entegrasyonları | Yeni üretim sınıflandırma şeması yayımlanmadı |
| Paylaşımlar / erişim denetimi | Yetki ve kaynak görünürlüğü testleri, sayfa/bağlantı taraması | Her kullanıcı/grup kombinasyonu gerçek kurum diziniyle denenmedi |
| Raporlar / denetim | Filtre, CSV ve denetim kaynak kapsamı/veritabanı testleri; audit API 200/403 | Bütün raporların belediye mevzuatına uygunluğu bu teknik denetimin kapsamında değil |
| Sistem ayarları | Ayar/yükleme politikası regresyonları, sayfa ve yapılandırma durumları | Dış sağlayıcıların kimlik bilgileri eklenmedi |
| Servis ve Kalite | Operasyon testleri, canlı overview API 200/403 ve durum ekranı | Felaket kurtarma tatbikatı veya kuyruk mesajlarını yeniden yürütme yapılmadı |
| Profil / giriş | Form, kimlik, güvenli geri dönüş ve proxy testleri; HTTP | Kullanıcı adı/parola girişi bilinçli demo akışıdır; gerçek kimlik doğrulama değildir |

## Açık entegrasyonlar ve test sınırları

- LDAP API henüz verilmedi. Gerçek giriş, hesap kapatma/aktifleştirme, parola yönetimi ve dizin eşitlemesi doğrulanamadı.
- WFS/CBS bağlantısı yapılandırılmamış. Harita servisinden gerçek veri alma tamamlanmış sayılmamalı.
- TSA ve onaylı PAdES sağlayıcısı olmadan tam imza/zaman damgası uygunluğu iddia edilmemeli.
- Tarayıcı/kamera donanımı ve görsel tarayıcı oturumu yok. PDF tam ekran, panel taşması, klavye odağı ve mobil görünüm için ayrıca görsel kabul testi gerekiyor.
- Tüm statik menüler kontrol edildi; 150 bağlı URL dinamik sayfa/sorgu örneğidir. Bütün kayıtların, bütün düğmelerin ve tüm yetki kombinasyonlarının canlı tıklama testi yapılmadı.
- Sistem menülerinde ad oluşturup hiçbir iş yapmayan yeni bir sahte başarı kontrolü bulunmadı; bu sonuç mevcut kaynak taraması ve test kapsamıyla sınırlıdır.

## Tekrar çalıştırma ve kanıt

- `npm --prefix web run test`
- `npm --prefix web run typecheck`
- `npm --prefix web run build`
- `python3 scripts/verify_architecture.py`
- `python3 scripts/verify_menu_routes.py` — yerel web açık olmalı; yalnız GET yapar. 30 statik sayfa ve en fazla 150 bağlı URL tarar.
- `dotnet test Mbb.Archive.slnx --no-restore -m:1 -p:UseSharedCompilation=false` — tüm entegrasyonlar için MBB_ARCHIVE_TEST_POSTGRES yalnızca izole `mbb_archive_*tests*` veritabanına, MBB_ARCHIVE_TEST_OPENSEARCH test indekslerine izin veren servise ayarlanmalı.

Sayfa kanıtı: `menu-route-audit-2026-09-10.json`. Yetki karşılaştırması: `menu-api-audit-2026-09-10.json`. Boş istek kontrolleri: `menu-invalid-input-audit-2026-09-10.json`. Kanıt dosyalarında belge metni veya kimlik bilgisi saklanmadı.
