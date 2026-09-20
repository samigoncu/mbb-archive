# Gerekçeli sürüm iptali

Belge görüntüleyicisinde seçilen sürüm, `Sürümü iptal et` alanından gerekçeyle
geçersiz kılınır. Dosya baytları, hash, sürüm numarası ve sürüm geçmişi korunur.
İptal edilmiş sürüm, mevcut belge okuma/indirme yetkileriyle görüntülenebilir;
arayüz iptal durumunu, gerekçeyi, kullanıcıyı ve zamanı gösterir.

- İşlem `documents.versions.cancel` izni ve belgenin sahip biriminde yazma
  yetkisi gerektirir. Bootstrap yöneticisi mevcut yetki mekanizmasına tabidir.
- Arşivlenmiş belgede yeni iptal işlemi yapılamaz.
- Güncel sürüm iptal edilirken başka bir geçerli sürüm açıkça seçilir.
  Tek geçerli sürüm iptal edilemez; önce yeni sürüm yüklenir.
- `current_version_number` güncel sürümü belirler. Yeni yüklemeler geçmişteki
  numaraları yeniden kullanmaz ve güncel sürüm olur.

`POST /api/v1/documents/{id}/versions/{number}/cancel` gövdesi:

```json
{
  "expectedVersion": 7,
  "requestId": "922be551-7e4d-45dc-b7ea-b5f6155ba666",
  "reason": "Yanlış nüsha yüklenmiş.",
  "replacementVersionNumber": 1
}
```

`expectedVersion`, belge detayındaki `concurrencyVersion` değeridir. Güncel
olmayan sürümde `replacementVersionNumber` null gönderilir. Aynı kullanıcı ve
aynı içerikle aynı `requestId` tekrarlandığında işlem yeniden uygulanmaz.
Çakışma 409, eksik yetki 403, birim kapsamı dışında kalan belge 404 döner.

İptal bilgisi ve `documents.version-cancelled.v1` outbox olayı aynı veritabanı
işleminde kaydedilir. Olay denetim günlüğüne aktarılır ve arama indeksini
yeniler. Gecikmiş işleme olayları güncel sürümü kaynağından yeniden çözer;
OCR/metin sorguları da güncel sürümün işleme çıktısını kullanır.

`AddDocumentVersionCancellation` geçişi mevcut belgelerin güncel sürümünü
en yüksek mevcut sürüm numarasıyla doldurur; hiçbir sürüm veya dosya silmez.
Tasarım zamanı aracı `MBB_DOCUMENTS_MIGRATION_CONNECTION` ya da
`ConnectionStrings__Documents` bağlantısını kullanır; Development ortamında
yerel API yapılandırmasını okuyabilir.

Bu işlem fiziksel dosya silme veya imha gerçekleştirmez. Kalıcı kaldırma,
saklama ve koruma kontrollerini içeren ayrı devir–imha sürecinin konusudur.
