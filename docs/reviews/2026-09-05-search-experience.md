# Arama ekranı — Temel ve Gelişmiş

Paylaşılan ekran görüntülerindeki düzen mevcut uygulamaya uyarlandı:

- Temel görünüm: solda anahtar kelime ve ek filtreler, sağda başlangıç açıklaması/sonuçlar.
- Gelişmiş görünüm: eklenip kaldırılabilen en fazla 10 alan/koşul/değer satırı.
- Koşullar VE ile birleştirilir. İçerir/içermez sözcük veya ifade eşleşmesidir;
  eşittir/eşit değildir tam, büyük/küçük harfe duyarlı değer karşılaştırmasıdır.
- Alanlar: başlık, başlık/metin anahtar kelimesi, dosya biçimi, dosya planı kodu
  ve yayınlanmış şemalardaki aranabilir üstveri alanları.
- Anahtar kelimesiz, yalnız filtreyle arama desteklenir. Üstveri dışlama koşulu,
  aynı nested girdide anahtar ve değeri birlikte kontrol eder.
- Sonuçlar: liste/tablo, tablo ve CSV sütunu seçimi, görünen sayfayı CSV indirme.
- Koşullar URL'de korunur; bağlantı kopyalama, eski arama bağlantıları,
  sonuç filtreleri ve sayfalama desteklenir. Paylaşılan URL oturum yetkisi sağlamaz.
- Servis hatası boş sonuç gibi gösterilmez; geçersiz koşullar reddedilir.
- Mevcut genel anahtar kelime aramasının OCR sayfa vurguları ve coğrafi
  eşleşmeleri korunur. Gelişmiş anahtar kelime satırı başlık/metin/dosya planı
  başlığında ifade eşleşmesi uygular; genel aramanın yaklaşık eşleşmesinden farklıdır.

Ekran görüntüsündeki abonelik/deneme kartı kopyalanmadı. Arama indeksinde
karşılığı bulunmayan klasör hedefi ve güvenlik etiketi filtresi eklenmedi.
Tarih aralığı, sonraki düzeltmede hem Basit hem Gelişmiş görünüme eklendi.
Yüklenme tarihi ilk başarılı dosya staging zamanıdır; belge kayıt tarihi
kaydın oluşturulma zamanıdır. Kaynak Documents modülünün public contract
sağlayıcısıdır. İndeks güncellenme zamanı bu tarihler yerine kullanılmaz.
Başlangıç ve bitiş günleri Türkiye saatinde dahildir; tarih tek başına da
aranabilir, URL/sayfalama/sıfırlama ve sonuç listesi/tablo/CSV desteklenir.
Basit aramada Ara düğmesi kelime alanının hemen altındadır.

Doğrulama:

- .NET çözüm derlemesi: 0 hata, 0 uyarı.
- Search testleri: 13 geçti.
- Arayüz testleri: 30 geçti.
- Next.js üretim derlemesi ve TypeScript kontrolü geçti.
- Mimari kontrolü ve diff boşluk kontrolü geçti.
- Gerçek OpenSearch üzerinde filtreyle arama, tam başlık, çelişen koşullar,
  üstveri dışlama ve geçersiz alanın HTTP 400 ile reddi doğrulandı.
- Temel, gelişmiş ve koşullu sonuç sayfaları gerçek SSR HTTP 200 döndü.
- CUA tarayıcı sağlamadığı için görsel/tıklamalı tarayıcı testi yapılamadı.

## Tarih ve basit arama düzeltmesi doğrulaması

- 12 mevcut kaydın tamamı gerçek kayıt tarihleriyle yeniden indekslendi;
  8 kaydın gerçek yüklenme tarihi var, dosyasız kayıtlara tarih uydurulmadı.
- Eski boş CBS `{}` projeksiyonu boş ilişki listesi olarak okunabiliyor;
  dolu/hatalı nesneler sessizce atılmıyor. İndeksleme kuyruğu öncesi yedek:
  `.local-data/review/search-date-index-requests-before.json`.
- API açılışındaki yinelenmiş boş Organization yapılandırma anahtarı kaldırıldı.
- Son arama backend testleri: 18 geçti. Arama arayüz testleri: 10 geçti.
- .NET ve Next.js üretim derlemeleri, mimari kontrol geçti. Genel arayüz
  çalıştırmasında 31 geçti, aramadan bağımsız `does not render collapse toggle
  in topbar` testi başarısız oldu; ilgili dosyalar bu düzeltmede değiştirilmedi.
- Canlı kayıt/yüklenme günü dahil etme ve sonraki gün dışlama kontrolleri geçti;
  basit, gelişmiş ve yalnız tarihli sayfalar HTTP 200; API Healthy.
- Makine okunabilir sonuç: `2026-09-05-search-dates-results.json`.
- Mevcut kurulumda tamamlanmış Search indeks istekleri yeniden kuyruğa alındı.
  Diğer kurulumlarda da yeni tarih eşlemesi sonrası mevcut belgeler normal
  Search indeksleme hattından geçirilmelidir; yalnız yeni belgeleri indekslemek
  geçmiş belgelere tarih kazandırmaz.
