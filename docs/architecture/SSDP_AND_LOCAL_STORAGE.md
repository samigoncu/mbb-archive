# SSDP 2024 V.4 ve yerel depolama

## Katalog kaynağı

`data/file-plans/ssdp-2024-v4.json`, Devlet Arşivleri Başkanlığının kullanıcı tarafından verilen 25 sayfalık 2024 V.4 PDF'sinden çıkarılmıştır. Kaynak URL ve SHA-256 veri dosyasında bulunur. İlk 22 sayfadaki 718 başlık, 17 bölüm ve üç alt konu sütunu korunur. Son üç sayfa ve tablo içi açıklamalar `sourceNotes` içinde saklanır. Kaynakta olmayan 100–599 kurumsal alan kodları türetilmez.

`extract_ssdp_pdf.py` PyMuPDF tablo hücrelerini kullanır; sayfa geçişlerinde üst konu bağlamını korur. Ayrı sözcük-koordinatı kontrolü, 22 sayfanın her birindeki kod sayısını doğrulamıştır. Bölüm genel kodları dosyalama için seçilemez. 020 ve 030 alt kodları kaynağın ikincil kod kısıtlaması nedeniyle birincil dosyalama seçiminden çıkarılmıştır. Saklama ve tasfiye değerleri açıklamada kaynak bilgisi olarak sunulur; Retention modülünde otomatik imha politikası oluşturulmaz.

```sh
python3 scripts/import_file_plan.py data/file-plans/ssdp-2024-v4.json
python3 scripts/import_file_plan.py data/file-plans/ssdp-2024-v4.json --apply
python3 -m unittest discover -s scripts -p test_ssdp_import.py
```

İlk komut salt okunurdur. Aktarım `classification.manage` yetkili API üzerinden yapılır; gerekirse `ARCHIVE_API_TOKEN` ortam değişkeni kullanılır. Aynı plan ve başlıkları yeniden oluşturmaz; mevcut satır kaynakla uyuşmuyorsa durur. Kesintiden sonra aynı komut eksikleri tamamlar. Aktarımlar erişim denetimine yazılır. Önceki plan, belge sınıflandırmaları ve birim atamaları değiştirilmez. Yerel aktarım öncesi yedek `.local-data/backups/before-ssdp-2024-import.sql` dosyasındadır.

Tanımlamalar varsayılan olarak en yeni aktif planı gösterir. Birim atamaları **Tanımlamalar → Birimler** ekranından açıkça yapılır. Ana katalog ile birimlere atanmış kodların aynı sayıda olması beklenmez; yeni katalog belge erişim kapsamını genişletmez.

## Depolama hatasının nedeni ve düzeltme

`dotnet run --project src/Host/Mbb.Archive.Api` uygulamanın çalışma dizinini proje klasörüne alıyordu. Göreli `.local-data/originals` yolu, repo kökündeki mevcut dosyalar yerine boş proje klasörüne çözülüyor ve `documents.original_missing_in_storage` 409 hatası üretiyordu. Dosyalar silinmemişti.

API ve SecurityScan başlangıcında paylaşılan `src/Host/Shared/LocalStoragePaths.cs` kullanılır. Development ortamında varsayılan `.local-data/...` yolları, uygulama ikili dosyalarından yukarı doğru bulunan `Mbb.Archive.slnx` köküne sabitlenir. Böylece özgün dosyalar, staging ve OCR/artifact depoları aynı kökü kullanır. Açık mutlak yollar korunur. Diğer göreli yollar ve yayımlanmış uygulamalar `ContentRootPath` temelinde çözülür. Dağıtım için mutlak volume yolları kullanılabilir; compose zaten `/data/...` kullanır. Dosyalar taşınmaz ve depolar arasında belirsiz otomatik arama yapılmaz.

```sh
ASPNETCORE_ENVIRONMENT=Development dotnet run --project src/Host/Mbb.Archive.Api
DOTNET_ENVIRONMENT=Development dotnet run --project src/Workers/Mbb.Archive.Worker.SecurityScan
```

Gerçekte eksik dosyada API 409 döndürmeye devam eder. Tarayıcı iframe isteği, ham JSON yerine Türkçe hata ve işlem kodu gösterir; JSON isteyen istemcinin sözleşmesi korunur. Doğrudan içerik erişimindeki birim kapsamı değişmez.
