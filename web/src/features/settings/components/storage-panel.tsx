import { AlertTriangle, Database, HardDrive, Layers, Lock, ShieldOff } from "lucide-react";
import { formatBytes, type StorageStatus } from "../model/storage";

const row = "flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0";
const label = "text-sm text-muted-foreground";
const value = "text-sm font-medium tabular-nums";

/**
 * Depolama durumu.
 *
 * <para>
 * Yönetici buradan bir şey değiştirmez; depolama yeri dağıtım kararıdır ve
 * yolu değiştirmek var olan belgeleri taşımaz. Buradaki soru şudur:
 * belgeler nerede, ne kadar yer kaplıyor, disk doluyor mu, korumalı mı,
 * erişilebilir mi.
 * </para>
 */
export function StoragePanel({ status }: { status: StorageStatus | null }) {
  if (!status) {
    return <p role="alert" className="text-sm text-muted-foreground">
      Depolama durumu okunamadı. Bu bilgi için <span className="font-mono text-xs">operations.read</span> yetkisi gerekir.
    </p>;
  }

  const volume = status.volume;
  const nearlyFull = volume !== null && volume.usedPercent >= 85;

  return <div className="flex flex-col gap-4">
    {!status.isReachable && (
      <aside role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm leading-6 text-destructive">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Depoya erişilemiyor. Kayıtlar yerinde olsa da belgeler açılamaz.
          {status.problem && <span className="mt-1 block font-mono text-xs break-all">{status.problem}</span>}
        </p>
      </aside>
    )}

    {nearlyFull && (
      <aside role="alert" className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50/70 p-3 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>Birim %{volume.usedPercent} dolu. Disk dolduğunda yeni belge yüklenemez.</p>
      </aside>
    )}

    <dl className="rounded-lg border border-border px-3">
      <div className={row}>
        <dt className={`${label} flex items-center gap-2`}><Database className="size-4" aria-hidden />Sağlayıcı</dt>
        <dd className={value}>{status.provider === "S3" ? "S3 / MinIO" : "Yerel dosya sistemi"}</dd>
      </div>
      <div className={row}>
        <dt className={label}>{status.provider === "S3" ? "Kova" : "Kök dizin"}</dt>
        <dd className="max-w-[60%] truncate font-mono text-xs" title={status.location}>{status.location}</dd>
      </div>
      <div className={row}>
        <dt className={label}>Saklanan nesne</dt>
        <dd className={value}>{status.objectCount.toLocaleString("tr-TR")} · {formatBytes(status.storedBytes)}</dd>
      </div>
      <div className={row}>
        <dt className={`${label} flex items-center gap-2`}><Layers className="size-4" aria-hidden />Belge sürümü referansı</dt>
        <dd className={value}>{status.referenceCount.toLocaleString("tr-TR")}</dd>
      </div>
      {status.deduplicatedBytes > 0 && (
        <div className={row}>
          <dt className={label}>Tekilleştirme kazancı</dt>
          {/* Aynı içerik tek kez saklanır; bu, yazılmayan bayt. */}
          <dd className={value}>{formatBytes(status.deduplicatedBytes)}</dd>
        </div>
      )}
      {volume && (
        <div className={row}>
          <dt className={`${label} flex items-center gap-2`}><HardDrive className="size-4" aria-hidden />Birim</dt>
          <dd className={value}>
            {formatBytes(volume.availableBytes)} boş / {formatBytes(volume.totalBytes)} · %{volume.usedPercent} dolu
          </dd>
        </div>
      )}
      <div className={row}>
        <dt className={label}>Bekleyen yükleme</dt>
        <dd className={value}>
          {status.staging.fileCount === 0
            ? "yok"
            : `${status.staging.fileCount} dosya · ${formatBytes(status.staging.bytes)}`}
        </dd>
      </div>
      <div className={row}>
        <dt className={`${label} flex items-center gap-2`}>
          {status.worm.enabled ? <Lock className="size-4" aria-hidden /> : <ShieldOff className="size-4" aria-hidden />}
          Değiştirilemezlik (WORM)
        </dt>
        <dd className={value}>
          {status.worm.enabled
            ? `${status.worm.mode} · ${status.worm.retentionDays} gün`
            : status.worm.supported ? "kapalı" : "yerel depoda desteklenmiyor"}
        </dd>
      </div>
    </dl>

    <p className="text-xs leading-5 text-muted-foreground">
      Depolama yeri yönetim ekranından değiştirilmez: yolu değiştirmek var olan nesneleri taşımaz
      ve kayıtlı belgeler erişilemez hâle gelirdi. Değişiklik dağıtım yapılandırmasıyla, veri taşıma
      işiyle birlikte yapılır. Yedekleme yalnız veritabanını değil, bu dizini ve sır şifreleme
      anahtarlarının tutulduğu dizini de kapsamalıdır.
    </p>
  </div>;
}
