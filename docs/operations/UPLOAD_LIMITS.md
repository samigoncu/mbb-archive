# Yönetilebilir dosya yükleme sınırı

`/ayarlar` → **Dosya yükleme ve OCR** bölümünde dosya başına MB sınırı yönetilir.
Varsayılan 200 MB; aralık 1–2048 MB'dir. `Documents:FileStaging:MaxUploadBytes`
alt yapı tavanı daha küçükse panel ve API bu daha küçük tavanı uygular.
Ayar `documents.upload_policy` tablosunda kalıcıdır; değişiklikler yeniden
başlatma gerektirmez. PUT işlemi `access.admin` yetkisi ve beklenen sürüm ister.
Çakışan güncellemeler 409, geçersiz değerler 400, fazla büyük dosyalar 413 döner.
Eski/yeni değerler ve yönetici kimliği aynı transaction'da Documents outbox'ına
yazılır, `documents.upload-policy-changed.v1` olayı denetim günlüğüne aktarılır.

Tarama ekranı yalnız üstveriyi Server Action ile gönderir; dosyalar tek tek
`/api/documents/{id}/files` üzerinden akışla API'ye gider. Bu rota Next proxy'nin
gövde kopyalamasından hariçtir; oturum jetonu sunucuda eklenir ve gerçek kimlik /
belge yazma yetkisi API'de doğrulanır. Kestrel ve staging aynı ayarı uygular.
Yeni sürüm yükleme de bu sınırı kullanır. Açık tarama ekranı eski değeri
koruyabilir; panel değişikliğinden sonra ekranı yenileyin. API her yüklemede
güncel sınırı denetler.

## Büyük PDF ve OCR

Boyut artışı OCR'ın tamamlanma süresine garanti vermez. Sayfa sayısı, çözünürlük,
sıkıştırılmış görüntülerin açılmış boyutu, RAM/disk ve işlemci etkilidir.
Şifreli veya bozuk PDF'ler hâlâ reddedilir/başarısız olabilir.

- ClamAV Compose ayarları StreamMaxLength / MaxFileSize / MaxScanSize için
  2048M'dir; `AlertExceedsMax=yes` ile limit nedeniyle tamamlanmayan tarama temiz
  sayılmaz. Genişletilmiş içerik tarama tavanına ulaşabilir.
- ClamAV tarama süresi 600 saniye, güvenlik worker istemci süresi 660 saniyedir.
  Harici kurulumlarda bu ayarlar ayrıca hizalanmalıdır; panel ClamAV'ı yönetmez.
- OCR sayfaları PDFium ile sırayla render eder. pypdf büyük görüntü stream'ini
  açamazsa sayfa OCR'a yönlendirilir; pypdf güvenlik limitleri kaldırılmaz.
- OCR hesaplaması kuyruk bağlantısının event loop'unu bloke etmez.
- RabbitMQ varsayılan tüketici onay süresi 30 dakikadır. Çok uzun belgeler için
  kapasite ölçümü ve iş kuyruğuna uygun broker politikası gerekir; bu çalışma
  saatler süren OCR veya binlerce sayfalı dosya garantisi vermez.
  [RabbitMQ tüketici belgeleri](https://www.rabbitmq.com/docs/consumers)
- Başarısız PDF işi, yetkili kullanıcı tarafından mevcut yeniden işleme API'si
  ile orijinali yeniden yüklemeden tekrar başlatılabilir; çalışan iş yeniden
  başlatılmaz. Güvenlik kontrolü atlanmaz, zaten kabul edilmiş orijinal kullanılır.

## 2026-09-09 doğrulaması

Yerel yönetici sınırı 512 MB olarak kaydedildi ve yeniden başlatmadan sonra da
512 MB okundu. Denetim olayının günlüğe ulaştığı doğrulandı. Geçersiz değer 400,
eski sürümle kayıt 409, 512 MB + 1 bayt yükleme 413 döndü.

243.001.642 bayt (yaklaşık 232 MiB), üç sıkıştırılmamış görüntü sayfalı sentetik
PDF gerçek web rotasından 202 aldı; ClamAV sonucu **Accepted**, OCR/indeksleme
sonucu **Completed** oldu. Her üç sayfanın test metni çıktı dosyasında bulundu.
OCR motoru Tesseract 5.5.0, dilleri tur+eng; ortalama güven 0.9355.
Test belgesi: `01a0868d-8155-7b20-ac0e-449f93314d47`.
İş: `01a08696-98ed-7348-9e4b-9a7b93086683`.

API/solution ve web üretim derlemeleri, mimari kontrol, web typecheck ve
`git diff --check` geçti. Web: 175 test geçti. .NET tam koşu: 260 geçti,
38 yapılandırmaya bağlı test atlandı; son retry değişikliği için Processing
33 test ayrıca geçti. PDF/OCR yönlendirmesi: worker ortamında 7 test geçti.
Tarayıcı otomasyonu mevcut değildi; sayfalar HTTP/HTML üzerinden doğrulandı,
görsel tarayıcı testi yapılmadı.

Önceden mevcut yinelenmiş C#/JSX/type/import satırları derlemeyi engelliyordu;
belge bütünlüğü, devir/imha, dosya çalışma alanı ve keşif dosyalarında bu
çakışmalar giderildi. Bu işlem söz konusu özelliklerin işlevsel veya hukuki
hazırlığına dair ek bir doğrulama değildir.
