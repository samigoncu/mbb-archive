# Birim seçimi ve klasör biçiminde SDP ağacı

Tüm Belgeler ve Fiziksel Dosyalar ortak arşiv gezinmesini kullanır. Birim seçimi doğrudan URL ve sonuçları yeniler; ayrıca “Birimi aç” düğmesi yoktur. Birim değişince önceki konu, dosya, belge seçimi ve sayfalar temizlenir. Yükleme sırasında önceki birimin ağacı gizlenir. Birim adı ağacın kökünde görünür; SDP dallarında klasör simgeleri, bağlantı çizgileri ve seçili konu vurgusu kullanılır. Dalları açma/kapatma ile konuya gitme ayrı eylemlerdir; başlıklar yinelenmez.

SDP kapsamı hakkında kullanıcıya iki seçenek soruldu; yanıt gelmediği için açıkça belirtilen varsayımla, birimde dosya açılmış konular ve bunların gerçek üst düğümleri gösterildi. Dijital görünüm birim kapsamındaki dijital dosyaları, fiziksel görünüm fiziksel klasörleri esas alır. API'nin yetkili alt birimleri kapsayan filtre davranışı korunur. Bütün sayfalar okunur; tablo araması ve mevcut sayfa ağacın kapsamını değiştirmez. Yeni dosya oluşturma için ortak SDP kataloğu korunur. Dijital dosyaya henüz yerleştirilmemiş belgeler Tüm Belgeler listesinde kalır; tek başlarına dijital dosya ağacına dal eklemezler.

Yeni dijital/fiziksel dosya formları birim değişiminde yenilenir. Fiziksel dosya oluşturma formunda seçili birim başlangıç değeri olarak kullanılır.

Doğrulama:

- TypeScript, 89 arayüz testi ve üretim derlemesi başarılı.
- Yeni kontroller: iki ekranda otomatik birim geçişi, eski seçimlerin temizlenmesi, dalların açılıp kapanması, boş birim, gerçek üst düğüm ilişkisi, plan sürümü ayrımı, fiziksel kod eşlemesi, tam sayfalama ve hata aktarımı.
- Mimari kontrolü ve `git diff --check` başarılı.
- Çalışan web sunucusu güncellendi. Bilgi İşlem Dairesi Başkanlığı parametresiyle iki sayfa HTTP 200; doğru birim kökü, boş dosya ağacı ve kaldırılan düğme doğrulandı. Bu birimde iki belge var, dijital dosya henüz yok; belgeler listelenmeye devam ediyor.
- Ayrı geçici profille headless Chrome üzerinden canlı Tüm Belgeler ekranı görüntülendi. Aynı ağaç bileşeninin üç seviyeli görsel örneği üretim CSS'i ile ayrıca kontrol edildi. Örnek yalnız `/tmp` altında üretildi; arşive örnek veri eklenmedi.
- Bu değişiklik yetki veya rol atamalarını değiştirmez.
