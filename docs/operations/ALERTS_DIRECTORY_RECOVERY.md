# Alarm, dizin eşitlemesi ve kurtarma kayıtları

## Alarm ve bildirim işletimi

`/operations` ekranında kural oluşturma, etkinleştirme/pasifleştirme, değerlendirme,
alarm üstlenme/kapatma, bildirim geçmişi ve başarısız teslimi yeniden kuyruğa alma
bulunur. API işlemleri `operations.read`, `operations.alerts.manage` ve
`operations.alerts.acknowledge` izinleriyle korunur. Kullanıcı değişiklikleri erişim
denetimine, otomatik alarm/teslim geçişleri `operations.automation_events` tablosuna
aktör ve zamanıyla yazılır.

Değerlendirici 30 saniyede bir çalışır. Bir ölçüm belirtilen pencere boyunca eşiği
sağlarsa tek etkin alarm açılır. Aynı alarmın gözlem sayısı güncellenir. Ölçüm
kesintisi pencereyi sıfırlar; kayıp veri alarmı başarılı gibi kapatmaz. Ölçüm geri
alınıp eşik koşulu ortadan kalkınca alarm kapanır. Kuralın eksik ölçümü ekranda
belirtilir. Birden fazla uygulama örneği PostgreSQL işlem kilitleri ve tek etkin
alarm indeksiyle aynı değerlendirmeyi eşzamanlı uygulamaz.

Dış gönderim varsayılan kapalıdır. Etkinleştirmeden önce:

- `Operations:Automation:DeliveryEnabled=true`
- E-posta için `Operations:Notifications:Email:{Host,Port,Sender,EnableSsl}`;
  gerekiyorsa kullanıcı/parola secret üzerinden.
- Webhook için `Operations:Notifications:Webhook:AllowedHosts` içinde açık
  sağlayıcı sunucu adları. HTTPS zorunludur; HTTP yönlendirmeleri izlenmez.

Bağlantı ve parola bilgileri kaynak koda yazılmaz. Sağlayıcının gerçek teslim testi
kurum ortamında ayrıca yapılmalıdır. Beş başarısız deneme sonunda teslim
`DeadLettered` olur; yetkili kullanıcı yeniden kuyruğa alabilir. Denemeler arası
bekleme üstel artar. Başarılı teslimde zaman ve varsa sağlayıcı referansı tutulur.
Webhook'a kalıcı `Idempotency-Key`, e-postaya `X-Archive-Delivery-Id` gönderilir.
Uzak sağlayıcının cevabı ile veritabanı işlemi atomik olamayacağından süreç çöküşü
sonrasında en az bir kez teslim semantiği geçerlidir; SMTP için tekil teslim
vaat edilmez.

Yeni migration: Operations için `CompleteOperationsAutomation`.

## Kurum dizini

Birim Yönetimi ekranındaki Kurum dizini eşitlemesi bölümü
`organization.manage` yetkisi gerektirir. Durum yapılandırmanın varlığını gösterir;
bağlantı başarısını göstermez. LDAP kullanıcı/parola doğrulaması yerine okuma
amaçlı kullanılır; giriş OIDC sağlayıcısında kalır.

Önce birim eşitlemesi, ardından kullanıcı eşitlemesi uygulanır. Kullanıcı işleminde
arşiv/OIDC özne kimliği ve dizin kullanıcı adı ayrı girilir. Yönetici bunların aynı
kişiye ait olduğunu doğrular. Başarılı okuma sonrasında önceki dizin üyelikleri
uzlaştırılır; elle verilmiş üyelikler ve birincil seçimleri değişmez. AD pasif hesap
veya boş bölüm bilgisi yalnız dizin kaynaklı üyelikleri kaldırır. Bu durumda elle
verilmiş erişimler ayrıca gözden geçirilmelidir. Sağlayıcı arızası, belirsiz kullanıcı
sonucu veya eşleşmeyen birim otomatik yetki silmeye dönüştürülmez; işlem açık hata
ile durur. Hatalı işlemler geri alınır; aktör, zaman ve sonuç geçmişi saklanır.

Yeni migration: Organization için `AddDirectorySyncHistory`.

## Kurtarma tatbikatı

API gerçek geri yükleme komutu çalıştırmaz. İzole ortamdaki tatbikatın kayıt akışını
planlandı → çalışıyor → başarılı/başarısız olarak yönetir. Kanıt referansı ve sonuç
açıklaması zorunludur. Ölçülen RPO veya RTO hedefi aşıyorsa başarılı sonuç
kaydedilemez; başarısız sonuç, ölçümler ve kanıt saklanır. Eşzamanlı kayıt değişimleri
çakışma olarak reddedilir. Referans girmek, geri yükleme kanıtının teknik içeriğinin
bağımsız doğrulandığı anlamına gelmez; `RESTORE_DRILL_RUNBOOK.md` uygulanmalıdır.
