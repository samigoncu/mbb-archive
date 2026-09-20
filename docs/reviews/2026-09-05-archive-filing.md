# Birim bazlı dijital ve fiziksel arşiv

Dijital dosya artık fiziksel klasörden bağımsızdır. `/documents` ekranında erişilebilir birimler ve sürümlü Standart Dosya Planı ağacı gösterilir. Birim, SDP dalı, yıl ve başlıkla dijital dosya bulunabilir; dosya açıldığında belgeleri listelenir. Yeni dijital dosya için aktif birim, yürürlükte seçilebilir plan kalemi, başlık ve yıl gerekir. Plan ve kalem kimliği, plan sürümü, konu kodu ve başlığı dosyada korunur.

`/dosya-islemleri` fiziksel dosyaları aynı birim ve SDP düzeninde gösterir. Dosyanın sahip birimi, fiziksel yerinden ayrı tutulur. Dijital dosyadan “Fiziksel karşılıkları” açılıp o dosyaya bağlı fiziksel klasör oluşturulabilir. İki dosyanın birimi ve SDP kodu eşleşmelidir. Yer değiştirmek birim aidiyetini değiştirmez.

## Yetki sözleşmesi

Mevcut Claude rol çalışmasının `ICurrentUserScope` ve `ICurrentUserPermissions` sınırları kullanılır. Yeni `IArchiveUnitDirectory` Host içinde Organization sorguları üzerinden çözülür; modüller birbirlerinin DbContext'lerini kullanmaz.

- `documents.read`: dijital dosya ve belge okuma uçları.
- Mevcut `documents.read.all`: kurum genelinde okuma kapsamı; tek başına düzenleme yetkisi sağlamaz. Ortak arşiv birim dizini ve fiziksel kapsam da bu mevcut kapsamı kullanır; fiziksel uçlar ayrıca `physical-archive.read` ister.
- `documents.write`: kendi birim kapsamındaki dijital dosyaları oluşturma ve belgeleme.
- `documents.manage.all`: `documents.write` ile birlikte, görünür diğer birimlerde düzenleme. Kurum genelinde okuma da ayrıca tanımlanmalıdır.
- `physical-archive.manage`: kendi birim kapsamındaki fiziksel kayıt işlemleri.
- `physical-archive.manage.all`: diğer birimlerde fiziksel yönetim ve eski birimsiz fiziksel dosyalara kontrollü sahip atama; uçların temel işlem izni ayrıca gerekir.
- `physical-archive.loan`: birim kapsamı içinde ödünç/iade; kurum genelinde işlem için ayrıca global fiziksel yönetim kapsamı gerekir.

Hiçbir kullanıcıya otomatik rol verilmedi. Üyelik, izin ve hesap atamaları mevcut rol yönetiminde yapılır. Yeni dosya/belge sahibi kullanıcı girdisine güvenilerek atanmaz; aktif ve yazılabilir birim sunucuda çözülür. Birincil birim yoksa yükleme ekranında birim seçilmelidir.

## Eski veriler

`AddDigitalDossiers` ve `AddPhysicalFolderOwnership` migrationları mevcut belgeleri/dosyaları silmez veya tahmini birime atamaz. Eski fiziksel dosyaların sahip birimi boş kalır; bunları yalnız sınırsız okuma kapsamı görür. Birim ataması ayrıca yetkili kullanıcı tarafından yapılır; bağlı belgeler varsa hepsinin hedef birim ve SDP ile uyumlu olması gerekir. Mevcut belge sahipliği/quarantine çalışması korunmuştur. Eski belgelerin gerçek dairelere dağılımı doğrulanmış sahiplik bilgisiyle tamamlanmalıdır.

Dijital dosyaya ilk yerleştirme ve aynı dosyaya tekrarlı yerleştirme desteklenir. Başka bir dijital dosyaya taşıma, fiziksel bağlantıların tutarlılığını korumak için reddedilir; bu ayrı bir kontrollü taşıma akışı gerektirir. Dijital dosyanın konu seçimi, belgenin mevcut resmî sınıflandırma kaydını otomatik değiştirmez; tarama ekranı mevcut sınıflandırma akışını aynı SDP kalemiyle çalıştırır.

## Doğrulama

- Gerçek .NET derlemesi: 0 hata, 0 uyarı. Mimari sınır kontrolü geçti.
- Tüm çözüm: 191 test geçti, 0 atlandı; yeni arşiv yapısı için 7 PostgreSQL entegrasyon testi dahil. Ön yüz: 58 test geçti. Her iki yeni migration için bekleyen model değişikliği yok.
- İzole `mbb_archive_filing_tests` PostgreSQL veritabanında gerçek migration, EF sorguları, sahiplik kalıcılığı, aynı kodda farklı birim ayrımı, alt birim seçimi, doğrudan ayrıntı/barkod erişimi, ödünç ve doluluk sayımı, global okuma/yazma ayrımı ve yanlış belge bağlama testleri.
- Ön yüzde birim/SDP bağlantıları ve arama sırasında kapsamın korunması testleri; TypeScript ve üretim derlemesi.
- Yerel veritabanı migration öncesi `/tmp/mbb-before-archive-filing.dump` dosyasına yedeklendi. Migrationlar yerel veritabanına uygulandı.
- API 5080 ve ön yüz 3000 portunda yeniden başlatıldı. Dijital dosya, birim ve fiziksel dosya API uçları ile `/documents`, `/dosya-islemleri`, `/tarama` sayfaları HTTP 200 döndü. HTML içinde yeni kontroller doğrulandı. CUA tarayıcı bağlantısı bulunamadığından görsel tarayıcı incelemesi yapılamadı.
