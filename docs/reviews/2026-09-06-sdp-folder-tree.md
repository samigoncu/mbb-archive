# Standart Dosya Planı klasör ağacı

Dosya Planları ekranındaki düz tablo klasör ağacına dönüştürüldü. SDP kodları gerçek parentId ilişkisiyle, sarı klasör simgeleri ve dalları bağlayan çizgilerle gösterilir. Başlık seçilince kod, durum ve dosyalama bilgisi ile belge arama bağlantısı açılır. Arama, eşleşen başlıkların üst klasörlerini korur. Tümünü aç/daralt ve tek dal aç/daralt desteklenir.

Birim Yönetimi SDP eşleştirme alanı aynı klasör görünümünü kullanır. Ağacın kapanması veya arama yapılması kaydetme yükündeki seçimleri değiştirmez. Veri modeli, atamalar ve yetkilendirme değişmedi.

Doğrulama: 95 arayüz testi, TypeScript kontrolü, üretim derlemesi ve git diff --check başarılı. Yerel uygulama yeni derlemeyle yeniden başlatıldı. Gerçek Chrome üzerinde ana ağaç, aç/kapat, ayrıntı bağlantısı, 000 > 010 > 010.06 arama yolu ve kapat/aç sırasında birim seçiminin korunması kontrol edildi. Masaüstü ve 390px mobil ekran görüntüleri incelendi. Kontrolde birim eşleştirmesi kaydedilmedi.

Kanıtlar: /tmp/mbb-sdp-tree-tests.log, /tmp/mbb-sdp-tree-typecheck.log, /tmp/mbb-sdp-tree-build.log, /tmp/mbb-sdp-tree-browser-check.log, /tmp/mbb-sdp-tree.png, /tmp/mbb-sdp-unit-tree.png, /tmp/mbb-sdp-unit-tree-mobile.png.
