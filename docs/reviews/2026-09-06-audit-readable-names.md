# Denetim kayıtlarında okunabilir kullanıcı ve kaynak adları

Denetim ekranı kullanıcı, işlem, zaman, belge/dosya ve sonucu ayrı sütunlarda gösterir. Kullanıcı adı oturumun doğrulanmış ad alanlarından alınır; özne kimliği ayrı tutulur. Belge, dijital dosya, fiziksel klasör ve koleksiyon adları kendi modüllerinin yetkili sorguları üzerinden çözülür. Kimlikler, olay kodu, IP, iz kimliği ve hash teknik ayrıntılar altında korunur. Kullanıcıya veya belgeye tıklanarak işlem geçmişi süzülebilir; kullanıcı ve sistem olayları ayrı filtrelenebilir.

## Kayıt ve erişim davranışı

- Yeni erişim kayıtları varsa oturumdaki görünen kullanıcı adını da içerir. JWT'nin `sub` veya eşlenmiş `NameIdentifier` değeri özne kimliği olarak korunur.
- Belge oluşturma; dijital dosya oluşturma/açma/belge ekleme; fiziksel klasör oluşturma/açma/belge ekleme/taşıma/ödünç verme için açık kullanıcı işlem adları eklendi. Belge görüntüleme, önizleme ve indirme mevcut kayıtlardan gösterilir.
- Oluşturma uçlarında kaynak kimliği başarılı cevaptan alınabilir; hata gövdelerinden kimlik çıkarılmaz.
- Ad çözümleme HTTP üzerinden yeniden belge açmaz; doğrudan mevcut application sorgularını kullanır. Böylece denetimi okumak sahte bir belge erişim olayı oluşturmaz. Aynı kaynak bir sayfada bir kez çözülür.
- `audit.read` tek başına belge/dosya adı görme yetkisi vermez. Kaynağın okuma izni ve birim kapsamı ayrıca uygulanır. Erişilemeyen veya silinmiş kayıtta başlık olay yükünden geri doldurulmaz.
- Eski genel erişim kayıtlarındaki belge/dosya yolları görüntüleme sırasında tanınır. Ham olay yükü ve hash zinciri güncellenmez. Kaynak adı güncel yetkili kayıttan gelir; geçmişteki ad olduğu iddia edilmez.
- Adı kaydedilmemiş eski kullanıcılara kişi adı uydurulmaz. Kullanıcı adı mevcutsa gösterilir; yalnızca UUID varsa açık eksik bilgi etiketi kullanılır. Yerel geliştirme hesabı ayrıca belirtilir.

## Doğrulama

- Başlangıç ve son .NET çözüm derlemeleri: 0 hata, 0 uyarı.
- Tam .NET test çalıştırması: 199 başarılı, atlanan yok. Sonradan eklenen iki gerçek PostgreSQL ad/birim kapsamı testi de başarılı; toplam 201 farklı test doğrulandı.
- Yeni sunucu testleri: oturum adı/özne ayrımı, başarılı oluşturma kimliği, hata gövdesini kullanmama, eski yolların çözülmesi, olay yükünün korunması, yinelenen kaynak sorgularının önlenmesi, kullanıcı/sistem filtresi ve yetkisiz başlık sızıntısının engellenmesi.
- Gerçek belge/dosya sorguları ile kendi biriminde ad çözülmesi, diğer birimin adının saklanması ve yalnız denetim izninin yetersiz olması test edildi.
- Web: TypeScript kontrolü, 78 test ve üretim derlemesi başarılı.
- Mimari doğrulama ve `git diff --check`: başarılı.
- Yerel API ve web güncellendi. `/denetim?activity=user` HTTP 200; okunabilir kullanıcı adı, Türkçe sonuçlar ve yeni sütunlar HTML'de doğrulandı. Kullanıcı/sistem filtreleri doğru; art arda denetim API okumalarında son sıra numarası değişmedi.
- Test kayıtları yalnız `mbb_archive_audit_tests` veritabanında oluşturuldu. Kullanıcı arşivine test belgesi/dosyası eklenmedi. Canlı ekran doğrulaması HTTP/HTML üzerinden yapıldı; görsel tarayıcı testi yapılmadı.
