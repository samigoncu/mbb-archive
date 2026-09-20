# Metin ve resim içeren PDF’lerde OCR

## Doğrulanan neden

Malatya_Belediyesi_AçBakİmzala_Teklifi-30102025 belgesinin 7. sayfasında 16 resim var. Eski PDF inceleyicisi ilk 12 sayfanın ortalama metin uzunluğuna göre tüm PDF için OCR’yi kapatıyordu. Bu PDF’de de requiresOcr=false üretildiği için logo yazıları hiç OCR’ye gitmemişti. Eski indeks metni 2.976 karakterdi ve HALKBANK içermiyordu.

## Değişiklik

- PDF inceleme ve OCR ortak sayfa analizi kullanıyor. Her sayfa incelenir; resim referansı olan veya metni yetersiz sayfalar OCR’ye gider. İlk 12 sayfa ve ortalama karakter eşiği diğer sayfaları devre dışı bırakmaz.
- Yalnız native metin taşıyan sayfalar doğrudan çıkarılır. Karma PDF’de tek birleşik sonuç üretilir: native metin aynen korunur, onda bulunmayan OCR satırları eklenir. Önceden çıkarılan native metin tek başına ara sonuç olarak indekslenmez.
- Karma metin/resim sayfalarında Tesseract sparse-text PSM 11, görüntü/tarama girdilerinde PSM 3 kullanılır. Yerel render çözünürlüğü 300 DPI oldu. Gerçek motor sürümü, render DPI ve recognitionPolicy çıktı JSON’una yazılır. PDF render kaynakları her sayfada kapatılır.
- Tamamlanmış PDF’nin güncel sürümünü tekrar kuyruğa gönderen POST /api/v1/processing/documents/{id}/reprocess eklendi. documents.write ve sahip birimde yazma yetkisi gerekir. Görünmez belgeler reddedilir, aktif iş tekrar başlatılamaz. Eski çıktılar ve orijinal dosya korunur; yeni çıktı normal outbox/worker/index akışından geçer. İstek denetime kaydedilir. Yeni şema veya migration yok.
- Python test bağımlılıkları CI iş akışına eklendi.

## Kanıt

- Başlangıç ve son gerçek .NET derlemesi: 0 hata / 0 uyarı.
- 213 backend testi, 18 Python testi başarılı. Yeni testler karma PDF, örnekleme sınırı sonrası sayfa, seyrek sayfa, native metnin korunması, yalnız gerekli sayfaların render edilmesi ve yeniden işleme yetki/aktif iş korumalarını kapsar.
- Mimari doğrulama, Python syntax ve diff whitespace kontrolü başarılı.
- PDF/OCR worker’ları ve yerel API güncellendi. İlgili mevcut belge normal API ile yeniden işlendi; iş Completed, engine Tesseract/5.5.0, 7 sayfa.
- İndeks metni 3.903 karaktere çıktı. Gerçek arama API’si HALKBANK, ZiraatPay, PLATFORM, VizyonPay ve FUPS için ilgili belgeyi ve 7. sayfayı buldu. Highlight API’si her ad için sayfa üzerindeki koordinatları döndürdü.
- Orijinal PDF SHA-256 değeri değişmedi. Diğer mevcut belge yeniden işlenmedi.

Loglar: /tmp/mbb-ocr-dotnet-build.log, /tmp/mbb-ocr-dotnet-tests.log, /tmp/mbb-ocr-python-tests.log, /tmp/mbb-ocr-job-after.json, /tmp/mbb-ocr-search-check.json. Yerel API logu .local-data/logs/api-ocr-fix.log.

## Sınırlar ve kaynaklar

Stilize logo yazıları kusursuz tanınmıyor; eFinans ve Birleşik Ödeme gibi örneklerde harf hataları ve grafiklerden gelen gürültü kalıyor. Marka adları elle çıktıya eklenmedi. Native metin üzerinde tekrar OCR yapılabildiğinden yazım farkı olan bazı satırlar birleşik metinde yinelenebilir. Görüntü içeren her sayfa işlenir; logo içeren normal sayfalarda da ek CPU maliyeti vardır. Tamamen vektör şekillerle çizilmiş yazılar, yeterli native metin olan ve resim içermeyen bir sayfada ayrıca tespit edilmez. Eski diğer belgeler otomatik topluca yeniden işlenmez.

Resmî kaynaklar: pypdf metin çıkarımı görüntü içindeki yazıyı tanımaz: https://github.com/py-pdf/pypdf/blob/main/docs/user/extract-text.md . Tesseract PSM 11 dağınık metin içindir: https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html .
