# Dijital koruma ve PDF imza doğrulama

Fiziksel imha dijital asılları, sürümleri, üstveriyi veya denetim kayıtlarını silmez. Dijital silme yürütücüsü ve kullanıcı işlemi yoktur. Fiziksel imha tamamlanınca dijital saklama gereksinimi korunur.

## Depo koruması

S3 yüklemelerinde gerçek VersionId saklanır; uygulamanın sürüm indirme yolu bu sürümü okur. Eski nesneler otomatik eşitlemede içerik hash'i doğrulandıktan sonra sabitlenir. Aynı nesneyi kullanan belgelerin en uzun saklama süresi ve bütün hukuki blokeleri birlikte hesaplanır. Saklama süresi kısaltılmaz; uygulamadan önce var olan harici blokeler kaldırılmaz. Uygulamanın yönettiği blokeler için bucket'ta aynı legal-hold bayrağına başka bir otomasyon yazmamalıdır; ayrı sahipler aynı S3 boolean alanında ayırt edilemez.

`Archive:ProtectionSynchronization:Enabled=true` otomatik eşitlemeyi açar. `IntervalSeconds` varsayılan 300'dür. Etkinleştirmeden önce S3 versioning, Object Lock, erişim izinleri ve onaylı saklama kuralları doğrulanmalıdır. Yönetici Ayarlar → Dijital arşiv korumasından eşitlemeyi ayrıca başlatabilir. Başarısız nesneler hata durumuyla saklanır, sonraki çalışmada yeniden denenir. Yerel dosya deposu WORM olarak raporlanmaz. Migration'lar uygulanmadan otomasyonu açmayın.

## DSS PDF doğrulayıcı

Adaptör, Avrupa Komisyonu DSS'nin [resmî REST servisleri](https://ec.europa.eu/digital-building-blocks/DSS/webapp-demo/signature-rest) ve [OpenAPI sözleşmesine](https://ec.europa.eu/digital-building-blocks/DSS/webapp-demo/services/rest/validation/openapi.json) göre `validateSignature` çağrısı yapar. Kamusal demo servisine dosya gönderilmez; varsayılan bir dış URL yoktur.

Kurumun işlettiği/güvendiği DSS kurulumu için:

```text
Evidence__PdfValidation__Dss__BaseUrl=https://kurum-dogrulama.example/validation/
Evidence__PdfValidation__Dss__TimeoutSeconds=60
Evidence__PdfValidation__Dss__BearerToken=<secret store üzerinden>
```

TLS zorunludur; yalnız geliştirmede loopback HTTP için `AllowLoopbackHttp=true` kullanılabilir. HTTP yönlendirmeleri izlenmez. Trust store, sertifika iptal kontrolleri ve kurum doğrulama politikası DSS kurulumunun sorumluluğudur. Sağlayıcı yanıtı hatalı, eksik veya başka belgeye aitse sonuç geçerli kabul edilmez. Sağlayıcı raporu ve gönderilen içeriğin SHA-256 değeri doğrulama kaydında korunur.

Kanıt ve İmza ekranı gerçek sağlayıcı yapılandırmasını gösterir ve PDF yükleyerek doğrulama başlatır. Adaptör sözleşme testleri gerçek kurumsal sertifikalar veya TSA/OCSP/CRL hizmetleriyle uçtan uca doğrulama yerine geçmez. Bir sağlayıcının bağlanması tek başına nitelikli imza ya da mevzuata uygunluk iddiası değildir.
