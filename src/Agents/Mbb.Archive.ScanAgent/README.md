# Yerel ağ tarama köprüsü

Python 3 standart kütüphanesiyle çalışan eSCL / AirScan adaptörü. TWAIN/WIA/WSD
adaptörü değildir. Cihazın eSCL desteği ve adresi üreticiden doğrulanmalıdır.

1. Cihazın eSCL servis URL'sini `SCAN_DEVICE_URL` ortam değişkeninde tanımlayın.
2. `python3 src/Agents/Mbb.Archive.ScanAgent/escl_agent.py` çalıştırın.
3. Terminaldeki geçici anahtarı **Tarama ve İndeksleme > Ağ Tarayıcısından Al**
   alanına girin. Anahtarı paylaşmayın. `SCAN_AGENT_TOKEN` ile en az 32 karakterlik
   kalıcı secret verilebilir; dosyada veya kaynak kodda saklamayın.
4. Web origin'i farklıysa `SCAN_APP_ORIGIN` değerini tam origin olarak verin.
5. Cihazı bağlayın, cam/ADF seçin, tarayın. Sayfalar otomatik olarak indeksleme
   alanına gelir. Künye girip Arşive Aktar ile mevcut karantina/AV/OCR/indeks
   hattına gönderin. Aynı dosyayı bilgisayardan tekrar bulup seçmek gerekmez.

Köprü yalnız `127.0.0.1:17891` üzerinde dinler. Host, Origin ve bearer secret
kontrol edilir; cihaz adresi istemciden alınmaz. HTTP yönlendirmeleri kapalıdır.
TLS sertifikası doğrulaması kapatılmaz. Yanıtlar no-store, sayfa başına 32 MiB,
parti başına 256 MiB/100 dosya/10 dakika sınırındadır. Dosyalar RAM'e tümüyle
alınmadan geçici dosyadan aktarılır. Tarayıcı sekmesinde toplam parti boyutu kadar
bellek gerekebilir. Başarısız taramada alınmış sayfalar korunur. Cam taraması tek
çıktıda durur; ADF NextDocument 404 ile tamamlanır. Cihaz 503 yanıtı en fazla 20
kez denenir. Diğer cihaz hataları başarılı tarama olarak gösterilmez.

Tarayıcı yerel ağ erişimi için izin isteyebilir. HTTPS dağıtımında kullanılan
tarayıcının loopback / local-network politikasını gerçek cihazla doğrulayın.
Üreticilere özgü eSCL davranışları için donanım kabul testi zorunludur.

Referans: https://github.com/OpenPrinting/go-mfp/tree/master/proto/escl
