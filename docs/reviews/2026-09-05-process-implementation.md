# Belediye arşiv süreçleri — uygulama ve devam notu

5 Eylül 2026. Kullanıcının Claude'dan geliştirmeyi devretmesi üzerine uygulandı.
Önceki inceleme: [yeterlilik raporu](2026-09-05-archive-readiness-audit.md).

## Çalışan teslim

Yerel uygulama: http://localhost:3000/devir-imha

Komisyon ve devir: http://localhost:3000/devir-imha/islemler

- Geçersiz, etkin olmayan veya seçilemeyen dosya planı koduyla kayıt beyanı engellenir. Geçerli saklama kuralı Classification ve Retention'ın public contract'ları üzerinden doğrulanır; modüller arası tablo erişimi eklenmedi.
- Aynı kayıt beyanının tekrarı ikinci olay üretmez; farklı politika ile tekrar beyan reddedilir. Yeni beyan olayında gerçek çağıran `DeclaredBy` bulunur.
- Aynı arşiv kaydına farklı mesaj kimlikleriyle tekrar gelen beyan birden fazla saklama dosyası oluşturmaz. PostgreSQL'in mikrosaniye hassasiyetiyle olayların 100ns hassasiyeti arasındaki fark da hesaba katılır.
- Saklama kuralları arayüzden gerçek API'ye kaydedilebilir. Kod, ad, süre ve karar doğrulanır. Süreler kurumun onaylı planından girilmelidir.
- Bir dosyaya birden fazla hukuki bloke konabilir. Belirli bloke kimliğiyle kaldırma, aktör ve gerekçe kaydı vardır. Bir blokeyi kaldırmak diğerlerini kaldırmaz; tekrar kaldırma sayacı ikinci kez azaltmaz.
- Süresi dolmuş, açık ve blokesiz saklama dosyasından değerlendirme taslağı açılabilir. Aynı dosyada aynı anda yalnız bir açık işlem bulunabilir; bu sınır DB unique index ile de korunur.
- Taslak → komisyon görüşleri → nihai onay → devir teslim kabulü veya kalıcı saklama kararı işletilebilir.
- Hazırlayan kişi kendi işlemini değerlendiremez. Aynı kişi iki kez oy veremez. Nihai onaylayan, hazırlayan ve değerlendirenlerden farklı olmalıdır. Teslim alan, hazırlayan ve nihai onaylayandan farklı olmalıdır.
- Komisyonun olumsuz görüşü işlemi reddeder; eski görüşler korunur. Yeni değerlendirme gerektiğinde yeni taslak oluşturulur.
- Onaydan sonra konan bloke dahil, bütün ileri geçişlerde saklama ve hold kontrolü tekrar yapılır. Process ile RetentionCase concurrency token'ları aynı transaction'da yazılır; eşzamanlı hold kazanırsa onay ve onun outbox olayı birlikte rollback olur.
- Teslim alan arşiv, teslim alan kişi, tutanak referansı ve zaman kaydedilir. Kalıcı saklama kararı vade tarihini kaldırır; orijinal dosyayı silmez.
- Tamamlanmış işlem için SHA-256 ile kontrol edilebilir JSON idari tutanak indirilir. Tutanak açıkça nitelikli elektronik imza veya dosya imha kanıtı olduğunu iddia etmez.
- Durum, filtre, sayfalama, belgeye dönüş, saklama dosyasına dönüş ve hukuki bloke geçmişi ekranları mevcut arayüze bağlandı.
- Sidebar'da kalmış yinelenen JSX parçaları giderildi. GeoJSON sınır hesabı ayrı dosyaya taşınarak önceki mimari boyut ihlali kapatıldı.

## Önemli kapsam sınırları

Bu teslim önceki rapordaki bütün eksiklerin kapandığı anlamına gelmez.

1. **İmha yürütülmez.** İmha kararı komisyon ve onay aşamalarından geçebilir; doğrulanmış fiziksel/dijital yürütücü ve gerçekleşme kanıtı olmadığı için Approved durumunda bekler. Silme endpoint'i veya sahte “imha tamamlandı” sonucu eklenmedi. Transfer/Review politikası kendiliğinden imha yetkisine dönüştürülemez.
2. **Devir teslimi idari kabul kaydıdır.** Bu paket dış kuruma SIP/AIP gönderme, dosya baytlarını başka depoya taşıma, fiziksel kutu taşıma veya arşiv sahipliği entegrasyonunu gerçekleştirmez. Alıcı yetkili teslim aldığını kaydeder; bu kayıt “paket otomatik aktarıldı” diye sunulmamalıdır.
3. Bu akış saklama süresi dolan kayıtların değerlendirilmesidir. Aktif birim arşivinden kurum arşivine süresi dolmadan yapılan toplu devir için ayrı teslim listesi/kabul/ret akışı gerekir.
4. Komisyon görevlendirme referansı kaydedilir, fakat resmî üye listesinin kurum diziniyle eşleştirilmesi bu pakette yoktur. Yetkiler ve birbirinden farklı kullanıcılar kontrol edilir. Nihai onay aşamasındaki ayrıca ret/iadeye gönderme, vekâlet, komisyon süreleri ve yeniden atama akışları genişletilmelidir.
5. Gerçek çok kullanıcılı işletim için kurumsal kimlik bağlantısı tamamlanmalıdır. Yerel `dev-admin` aynı kişi olarak kaldığından kendi hazırladığı işlemi başka üyeymiş gibi onaylayamaz. Geliştirme amaçlı kullanıcı taklidi/backdoor eklenmedi.
6. Mevcut web giriş sayfası hâlâ simülasyon içeriyor; ortak web API istemcisinin üretim oturumunu backend'e taşıması henüz tamamlanmış değil. Kullanıcıya EBYS adı ve AD/LDAP/OIDC ürün bilgisi soruldu. Parola istenmedi.
7. WORM–saklama süresi–legal hold senkronizasyonu, S3 sürüm kimliği, belge/birim bazlı arama yetkilendirmesi, rendition, iş/dava/proje workspace ve gerçek EBYS/EYP/KEP adaptörleri önceki rapordaki açık işler olmaya devam ediyor.
8. Tutanaktaki hash içerik bütünlüğü içindir; kaynak kimliğini tek başına ispatlamaz. Elektronik imza/zaman damgası sağlayıcısı ile bağlanması ayrı iştir.

## Yapılandırma ve yetkiler

`Retention:Disposition:RequiredIndependentReviews` / `Retention__Disposition__RequiredIndependentReviews`:
varsayılan 2, geçerli aralık 2–20. Bu teknik asgari sayı mevzuata uygun komisyon oluşumu iddiası değildir.
Kurumun gerçek kuralına göre ayarlanmalıdır. Değer işlem oluşturulduğunda kopyalanır; sonraki ayar değişikliği açık işlemin gerekli görüş sayısını sessizce değiştirmez.

| Eylem | Backend izni |
|---|---|
| Dosyalar, süreçler ve yetenekler | `retention.read` |
| Saklama kuralı oluşturma | `retention.rules.manage` |
| Bloke koyma/kaldırma | `retention.holds.manage` |
| Taslak oluşturma ve komisyona gönderme | `retention.disposition.prepare` |
| Komisyon görüşü | `retention.disposition.review` |
| Nihai onay | `retention.disposition.approve` |
| Arşiv devrini teslim alma | `retention.transfers.accept` |
| Kalıcı saklama kararını uygulama | `retention.disposition.execute` |
| İdari tutanağı dışa aktarma | `retention.export` |

Bu izinler otomatik olarak gerçek kullanıcılara verilmedi. Mevcut development bootstrap davranışı korunur; üretimde kurumun rol eşlemesine açıkça eklenmelidir.

## API ve veri

Yeni yollar `/api/v1/retention` altında:

```text
GET  /cases/{id}
POST /cases/{id}/legal-holds/{holdId}/release
GET  /dispositions/
POST /dispositions/
GET  /dispositions/{id}
POST /dispositions/{id}/submit
POST /dispositions/{id}/reviews
POST /dispositions/{id}/approve
POST /dispositions/{id}/accept-transfer
POST /dispositions/{id}/keep-permanently
GET  /dispositions/{id}/receipt
GET  /dispositions/capabilities
```

Oluşturmada `requestId` idempotency anahtarıdır. Aynı anahtar/farklı içerik 409 üretir. İleri adımlar `expectedVersion` ister; eski sürüm 409 üretir.

Eski `/cases/{id}/legal-holds/release` yolu korunur; artık `reason` gövdesi gerekir. Birden fazla etkin bloke varsa hangisinin kaldırılacağını tahmin etmek yerine 409 döner. Yeni istemciler kimlikli yolu kullanmalıdır. Bu sözleşme sıkılaştırması kaldırma gerekçesinin denetim kaydında tutulması içindir.

Yeni olaylar `retention.disposition-changed.v1` ve `retention.legal-hold-changed.v1`; durum değişimi ve outbox aynı transaction'dadır. Mevcut Audit `#` binding'i bunları toplar. Tutanak indirme ayrıca erişim audit'i üretir.

Migration: `20260905145900_AddDispositionProcessesAndHoldProvenance`.

- Yeni tablolar: `retention.disposition_processes`, `retention.disposition_reviews`.
- Ek alanlar: `retention.legal_holds.released_by`, `release_reason` (nullable).
- `Up` mevcut veri silmez; yerel geliştirme veritabanına uygulandı.
- `Down` yeni tabloları/alanları siler; işlem verisi oluşmuş ortamda yedek ve değerlendirme olmadan geri alınmamalıdır.
- Tasarım fabrikası, migration oluştururken diğer modülleri/worker'ları başlatmaz. Bağlantı `MBB_RETENTION_MIGRATION_CONNECTION` veya `ConnectionStrings__Retention` ile verilebilir. Development ortamında mevcut development ayarını da okuyabilir.

## Doğrulama

- API build: **0 hata, 0 uyarı**.
- Backend: **18 projede 146 test başarılı**; bunların 3'ü gerçek PostgreSQL entegrasyon testidir, bu doğrulamada atlanan yoktur.
- PostgreSQL 18 geçici konteyneri: migration ve yeniden okuma, eşzamanlı hold/onay + outbox rollback, iki açık işlem unique sınırı başarılı. Mevcut belediye belgeleri test için değiştirilmedi.
- Frontend: **25 test başarılı**, typecheck başarılı; 2 yeni süreç form testi sunucu hatasının görünmesini ve çift gönderimin engellenmesini kontrol eder. Toplamın içindeki 3 layout testi mevcut paralel değişikliklerden gelmektedir.
- Next.js production build geçici kaynak kopyasında başarılı; çalışan `.next` geliştirme diziniyle çakıştırılmadı.
- `python3 scripts/verify_architecture.py` başarılı.
- Yenilenen localhost API: health, capabilities, süreç listesi ve saklama listesi HTTP 200.
- `/devir-imha` ve `/devir-imha/islemler` HTTP 200; sunucu hata sayfası bulunmadı.
- Tarayıcı görüntüsü/etkileşim testi yapılmadı; önceki CUA erişiminde tarayıcı yoktu. HTTP kontrolü görsel QA yerine geçmez.
- Depo genelindeki `git diff --check`, bu pakette değiştirilmemiş `folder-actions.ts` ve `scan-indexing-studio.tsx` dosyalarında önceden bulunan EOF boş satırlarını bildiriyor.

Tekrar çalıştırma:

```bash
dotnet test Mbb.Archive.slnx --verbosity quiet -m:1 -p:UseSharedCompilation=false
cd web
npm run typecheck
npm test
npm run build
```

PostgreSQL entegrasyon testleri için `MBB_ARCHIVE_TEST_POSTGRES` izole test veritabanını göstermelidir. Veritabanı adı `mbb_archive_` ile başlamalı ve `tests` içermelidir. Değişken yoksa bu üç test Inconclusive olur; bu durum PostgreSQL doğrulaması yapıldı diye raporlanmamalıdır.

Yerel API yeniden başlatıldı. Süreç PID kaydı `.local-data/api-codex-processes.pid`, log `.local-data/logs/api-codex-processes.log` içindedir; sır içerikleri rapora yazılmadı. Migration değişiklikleri commit edilmedi; kullanıcının ve Claude'un önceki değişiklikleri korunmuştur.

## Sonraki uygulama sınırı

Öncelik gerçek kullanıcı oturumu/rol ve kurum-bazlı belge erişiminin tamamlanmasıdır. Bunun yanında imha yürütme sağlayıcısı, belge paketli devir ve erken birim devri ayrı, testli dikey dilimler olarak tamamlanmalıdır. Bunlardan önce bu paket “bütün belediye arşiv süreçleri tamam” şeklinde sunulmamalıdır.
