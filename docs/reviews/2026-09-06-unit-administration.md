# Birim yönetimi ve önceden SDP eşleştirmesi

`/tanimlamalar/birimler` artık birim seçimi, SDP eşleştirmesi, yeni birim, ad/kısa ad güncelleme, üst birim değiştirme, aktiflik, üye ekleme/kaldırma ve birim silme işlemlerini içerir. Önceki kullanım açıklamalarında tarif edilip henüz mevcut olmayan eşleştirme ekranı bu değişiklikle uygulanmıştır.

SDP ağacındaki seçimler `organization.unit_file_plan_assignments` tablosunda birim, plan ve konu kimlikleriyle saklanır. Başlıkları kaydetmek için dosya oluşturulması gerekmez. Aynı konu birden fazla birime atanabilir; alt birimlere örtük atama yapılmaz. Gruplama düğümlerindeki kutular seçilebilir alt konuları topluca seçer. Arama ile görünmeyen seçimler korunur. Güncel ve seçilebilir olmayan yeni başlıklar reddedilir; var olan tarihsel atamalar korunabilir veya kaldırılabilir. Birim revizyonu eskiyse güncelleme reddedilir.

Tüm Belgeler ve Fiziksel Dosyalar ağaçları atanmış başlıkları ve mevcut tarihsel dosyaların konularını gösterir. Yeni dijital/fiziksel dosya formları ve tarama seçenekleri birime atanmış yürürlükteki konularla sınırlıdır. Dosya oluşturma, mevcut dijital dosyaya belge yerleştirme ve sınıflandırma sunucuda da kontrol edilir. Eşleştirme görünürlüğü mevcut birim kapsamından gelir; yönetim uçları `organization.manage` izni ister. Atama, belge erişim izni vermez.

Birim kaldırma alt birim, üyelik, dijital dosya, belge ve fiziksel klasör bağlantılarını kontrol eder. Bağlı kayıt varsa kaldırma reddedilir; pasife alma kullanılabilir. Kullanılmayan birim yönetim listesinden kaldırılır; eşzamanlı referansların kimliğini kaybetmemesi için veritabanında pasif kaldırılmış kimlik tutulur. Arşiv kaydı olan alt ağaçların taşınması, belge erişim yolları değişmeden kalması için engellenir. Yönetim işlemleri denetime yazılır.

## Doğrulama ve yerel uygulama

- Başlangıç ve son .NET derlemeleri başarılı; son derlemede 0 hata ve 0 uyarı.
- 207 backend testi başarılı, atlanan yok. Yeni gerçek PostgreSQL testleri dosyasız birime atamayı, birimler arasında atama ayrımını, geçersiz konu ve eski revizyonu, atanmamış konuyla dosya oluşturmanın reddini ve birim silme engellerini kapsar.
- TypeScript, 95 arayüz testi ve üretim derlemesi başarılı. Eşleştirme formu arama/ seçim davranışı, kayıt yükü, silme onayı ve hata gösterimi test edildi.
- Mimari doğrulama ve `git diff --check` başarılı.
- `20260906181017_AddUnitFilePlanAssignments` migration üretildi ve yerel veritabanına uygulandı. EF bekleyen model değişikliği olmadığını doğruladı.
- Öncesinde tam veritabanı yedeği `.local-data/backups/unit-admin-20260906_211346/before-migration.dump` yoluna alındı.
- API ve web yeniden başlatıldı. Birim Yönetimi, Tüm Belgeler, Fiziksel Dosyalar ve Tarama sayfaları HTTP 200. Yönetim formundaki işlem alanları HTML üzerinden, ekranın yerleşimi headless Chrome görüntüsü üzerinden doğrulandı.
- Test kayıtları yalnız ayrı test veritabanında oluşturuldu. Mevcut 29 birime kullanıcı adına atama yapılmadı; hiçbir gerçek birim silinmedi. Eşleştirme mevcut SDP kataloğunu kullanır; bu çalışma resmî kataloğun kapsamını güncellemez.
