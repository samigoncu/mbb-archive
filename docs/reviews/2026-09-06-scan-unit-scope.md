# Tarama ve indekslemede birim kapsamı

Tarama ekranı, kullanıcının belge yazabildiği aktif birimler içinden seçilen birimin dijital dosyalarını, uygun fiziksel klasörlerini ve son belgelerini gösterir. API'nin alt birimleri kapsayan sonuçları bu ekran için sahip birim kimliğiyle tam eşleşmeye daraltılır; listeler ilk 100 kayıtla sınırlanmaz.

SDP seçenekleri seçili birimin dijital dosyalarında veya bağımsız fiziksel klasörlerinde kullanılan, yürürlükteki seçilebilir konulardan oluşur. Ortak SDP kataloğu yeni dijital dosya oluşturma ekranında kullanılmaya devam eder. Boş birim için tarama ekranından dijital dosya oluşturma sayfasına bağlantı verilir.

Birim değişimi dijital dosya, fiziksel klasör ve SDP seçimlerini temizler; taranan sayfaları korur. Hızlı birim değişimlerinde geç gelen yanıtlar eski birimin seçeneklerini geri getiremez. Dijital dosya seçimi sınıflandırmayı devralır. Gönderimde aktif yazma yetkisi ve bütün dosya/sınıflandırma ilişkileri belge oluşturulmadan önce sunucuda yeniden doğrulanır.

## Doğrulama

- `npm --prefix web run typecheck`: başarılı.
- `npm --prefix web test`: 18 test dosyası, 75 test başarılı. Eklenen 17 test; birim kapsamını, sayfalamayı, ortak planın sızmamasını, hata aktarımını, hızlı birim değişimini ve değiştirilmiş gönderim alanlarının reddini kapsar.
- `npm --prefix web run build`: üretim derlemesi başarılı.
- `python3 scripts/verify_architecture.py`: başarılı.
- `git diff --check`: başarılı.
- Güncellenen yerel web sunucusunda `/tarama` ve Bilgi İşlem Dairesi Başkanlığı birim parametresiyle `/tarama`: HTTP 200. HTML'de doğru birim seçili; dijital dosya, SDP ve fiziksel klasör alanlarında boş arşive uygun yalnızca başlangıç seçenekleri mevcut.
- Erişim kapsamı dışında/geçersiz birim kimliği: HTTP 404.
- Canlı API üzerinden belge, dijital dosya ve fiziksel klasör sayıları hâlâ 0. Doğrulama için arşive örnek kayıt eklenmedi.

Bu değişiklik rol atamalarını değiştirmez. Yerel geliştirme hesabının genel yönetim yetkisi nedeniyle birim seçicisinde birden çok birim görülebilir; dosyalama seçenekleri seçili birimle sınırlıdır. Canlı doğrulama HTTP/HTML üzerinden yapıldı; tarayıcıda görsel doğrulama veya gerçek tarayıcı cihazıyla tarama yapılmadı.
