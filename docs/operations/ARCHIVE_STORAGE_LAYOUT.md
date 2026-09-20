# Arşiv depolama yerleşimi

Bu belge, arşiv nesnelerinin hangi dizinlerde tutulduğunu ve üretim
sunucusunda bunların nasıl bağlanacağını anlatır.

## Dizinler

| Dizin | Konteyner içi | İçerik | Kaybı ne anlama gelir |
|---|---|---|---|
| `originals` | `/data/originals` | Belgelerin asıl baytları | **Belgeler gider.** Veritabanı kayıtları kalır, içerik açılamaz |
| `keys` | `/data/keys` | Sır şifreleme anahtar halkası | Kayıtlı LDAP ve CBS parolaları bir daha çözülemez |
| `staging` | `/data/staging` | Taranmayı bekleyen geçici yüklemeler | Yalnız o an yüklenen dosyalar |
| `artifacts` | `/data/artifacts` | OCR metni, önizleme, dönüştürülmüş PDF | Yeniden üretilebilir |

`originals` içindeki dosyalar içerik adreslidir:

```
originals/sha256/<ilk 2 hane>/<sonraki 2 hane>/<tam sha256>
```

Aynı içerik bir kez saklanır; birden çok belge sürümü aynı nesneye işaret
edebilir. Dosya adı orijinal ad değildir — ad, tür ve sahiplik veritabanında
durur.

## Neden adlandırılmış Docker birimi kullanılmıyor

Adlandırılmış birim (`docker volume`) verisini `/var/lib/docker/volumes`
altına, yani **kök diske** koyar. Arşiv için ayrı bir disk vermek o durumda
mümkün olmaz ve kök disk dolduğunda yalnız yükleme değil, PostgreSQL ve
günlük yazımı da durur.

Bu yüzden dört dizin de **bağlama (bind mount)** ile host üzerinden gelir ve
yolları `.env` üzerinden verilir:

```bash
ARCHIVE_ORIGINALS_PATH=/srv/archive/originals
ARCHIVE_KEYS_PATH=/srv/archive/keys
ARCHIVE_STAGING_PATH=/srv/archive/staging
ARCHIVE_ARTIFACTS_PATH=/srv/archive/artifacts
```

Boş bırakılırsa depo içindeki `.local-data/…` kullanılır; bu yalnız geliştirme
içindir. Göreli yollar `deploy/` dizinine göre çözülür.

> API ve OCR/PDF/metin işçileri **aynı** değişkenleri okur. Farklı yol
> vermeyin: işçiler `originals`'ı salt okunur bağlar ve API'nin yazdığı
> nesneyi göremezse belge işlenmeden kalır.

## Ubuntu sunucuda ayrı disk

```bash
# Ayrı blok cihaz; LVM sonradan çevrimiçi büyütmeye izin verir
pvcreate /dev/sdb
vgcreate vg_archive /dev/sdb
lvcreate -l 100%FREE -n lv_originals vg_archive
mkfs.xfs /dev/vg_archive/lv_originals

mkdir -p /srv/archive/{originals,keys,staging,artifacts}

# fstab'a UUID ile yazın; noexec/nodev/nosuid sertleştirir, noatime yazmayı azaltır
blkid /dev/vg_archive/lv_originals
# UUID=...  /srv/archive/originals  xfs  defaults,noatime,nodev,nosuid,noexec  0 2

mount -a
df -h /srv/archive/originals
```

Doluluk ve erişilebilirlik **Sistem ayarları → Depolama** ekranından izlenir;
birim %85'i aştığında uyarı çıkar.

## Sanal sunucuda disk düzeni (Proxmox / VMware)

Arşiv tek bir havuzdur: taranmış belgeler yıla ya da birime göre bölünmez,
çünkü içerik adresleme tekilleştirmeyi ancak tek havuzda yapabilir. Bölmek,
aynı belgenin her bölümde tekrar yer kaplaması demektir.

Sanal makineye **üç ayrı disk** verin:

| Disk | Bağlanacağı yer | Başlangıç | İçerik |
|---|---|---|---|
| `sda` | `/` | 100 GB | İşletim sistemi, Docker imajları, günlükler |
| `sdb` | `/var/lib/docker` | 300–500 GB | PostgreSQL, OpenSearch, RabbitMQ |
| `sdc` | `/srv/archive` | 2 TB | Taranmış belgeler ve türevleri |

Kök diski ayırmanın sebebi şudur: arşiv dolduğunda yalnız yeni yükleme
durmalıdır. Aynı bölümdeyse PostgreSQL de yazamaz, günlük de yazılamaz ve
sunucuyu kurtarmak zorlaşır.

OpenSearch ayrı bir disktedir çünkü OCR metni tam metin olarak indekslenir ve
indeks belge sayısıyla birlikte ciddi büyür; kök diskte bırakılırsa sistem
diskini sessizce doldurur.

### Sanal disk ayarları

- **Thin provisioning kullanmayın** ya da datastore doluluğunu izleyin. Misafir
  2 TB görür, ama datastore'da yer kalmazsa yazma başarısız olur ve dosya
  sistemi bozulabilir. Arşiv diski için thick (VMware'de eager zeroed) tercih edin.
- Denetleyici: Proxmox'ta **VirtIO SCSI single**, VMware'de **PVSCSI**.
- `discard=on` verin ve misafirde `fstrim.timer`'ı açın; silinen alan
  datastore'a geri döner.
- Arşiv diskini VM anlık görüntülerinin dışında tutun (VMware'de *independent
  persistent*). Terabaytlık disk, VM snapshot'ını yavaşlatır. Bu disk ayrıca
  yedeklenir.

### Diski büyütmek (kesintisiz)

Hipervizörden diski büyüttükten sonra:

```bash
# Yeni boyutu çekirdeğe tanıt
echo 1 > /sys/class/block/sdc/device/rescan

pvresize /dev/sdc
lvextend -l +100%FREE /dev/vg_archive/lv_originals
xfs_growfs /srv/archive/originals     # ext4 ise: resize2fs
df -h /srv/archive/originals
```

Yeni disk eklemek de aynı hacme katılır: `pvcreate /dev/sdd && vgextend
vg_archive /dev/sdd`, ardından yukarıdaki `lvextend`. Bu yüzden baştan büyük
disk vermeye gerek yoktur.

### Geriye dönük tarama varsa hacmi ölçerek belirleyin

Tahmin yerine ölçün: temsili 200–500 sayfa tarayıp
**Sistem ayarları → Depolama** ekranından "Saklanan nesne" değerini okuyun.
Sayfa başına gerçek boyut buradan çıkar.

```
originals = toplam sayfa × sayfa başına boyut × 1.2
artifacts = originals × 0.15
```

Fiziksel arşivden sayfa sayısını kestirmek için pratik çarpanlar: bir standart
klasör 250–400 sayfa, bir arşiv kutusu 2.500–5.000 sayfa.

Geriye dönük tarama ilk yıl tepe yük yaratır, sonra yıllık evrak hacmine iner.
Bu yüzden 2 TB ile başlayıp ölçülen hıza göre büyütmek, baştan 10 TB ayırmaktan
daha iyidir: yedekleme ve anlık görüntü maliyeti gereksiz yere artmaz.

## Yedekleme

Veritabanı yedeği tek başına yeterli değildir:

- `originals` — yedeklenmezse belgeler kaybolur. İçerik değişmediği için
  artımlı yedek ve anlık görüntü (snapshot) ucuzdur.
- `keys` — küçük, ama yedeklenmezse şifreli entegrasyon parolaları çözülemez.
  Veritabanı yedeğinden **ayrı** yerde tutun; ikisi bir arada ele geçerse
  şifrelemenin anlamı kalmaz.
- `artifacts` ve `staging` yedeklenmek zorunda değildir.

## Değiştirilemezlik (WORM)

Yerel dosya sistemi WORM garantisi vermez; yönetim ekranı bunu açıkça belirtir.
Mevzuat gereği gerçek değiştirilemezlik isteniyorsa yol, S3 uyumlu bir depo
(örn. MinIO) üzerinde Object Lock açmak ve
`Documents__OriginalStorage__Provider=S3` ile geçmektir. Bu bir ayar değişikliği
değildir: nesneler kopyalanmalı, her birinin sha256'sı doğrulanmalı ve kaynak
ancak doğrulama bittikten sonra bırakılmalıdır.
