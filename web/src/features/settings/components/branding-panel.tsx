"use client";
import { useRef, useState } from "react";
import { Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  removeBrandingAssetAction,
  saveBrandingAction,
  uploadBrandingAssetAction,
  type BrandingResult,
} from "@/features/branding/api/branding-actions";
import {
  brandingAssetLabels,
  brandingAssetUrl,
  type Branding,
  type BrandingAssetKind,
  type BrandingAssetView,
} from "@/features/branding/model/branding";

const fieldClass = "mt-1.5";
const assetHints: Record<BrandingAssetKind, string> = {
  logo: "Sol menüde ve giriş ekranında görünür. Geniş formatlı PNG veya SVG önerilir.",
  favicon: "Tarayıcı sekmesindeki simge. Kare PNG, SVG veya ICO kullanın.",
  login: "Giriş ekranının sol tarafındaki büyük görsel.",
};

export function BrandingPanel({ initial, canManage }: { initial: Branding | null; canManage: boolean }) {
  const [branding, setBranding] = useState(initial);
  const [form, setForm] = useState({
    siteTitle: initial?.siteTitle ?? "",
    institutionName: initial?.institutionName ?? "",
    description: initial?.description ?? "",
    departmentName: initial?.departmentName ?? "",
    logoUrl: initial?.logo.source === "url" ? (initial.logo.url ?? "") : "",
    faviconUrl: initial?.favicon.source === "url" ? (initial.favicon.url ?? "") : "",
    loginImageUrl: initial?.loginImage.source === "url" ? (initial.loginImage.url ?? "") : "",
  });
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!branding) return <p role="alert">Kurum kimliği okunamadı. Sayfayı yenileyin.</p>;

  /** Her işlem güncel kaydı döndürür; sürüm ve görsel adresleri birlikte tazelenir. */
  function apply(result: BrandingResult, success: string) {
    if (result.error || !result.data) {
      setError(result.error ?? "İşlem tamamlanamadı.");
      return;
    }
    setBranding(result.data);
    setForm(current => ({
      ...current,
      departmentName: result.data!.departmentName ?? "",
      logoUrl: result.data!.logo.source === "url" ? (result.data!.logo.url ?? "") : "",
      faviconUrl: result.data!.favicon.source === "url" ? (result.data!.favicon.url ?? "") : "",
      loginImageUrl: result.data!.loginImage.source === "url" ? (result.data!.loginImage.url ?? "") : "",
    }));
    setMessage(success);
  }

  async function run(key: string, work: () => Promise<BrandingResult>, success: string) {
    if (pending || !canManage) return;
    setPending(key); setError(""); setMessage("");
    try { apply(await work(), success); }
    catch { setError("Sunucuya ulaşılamadı. Sayfayı yenileyip tekrar deneyin."); }
    finally { setPending(""); }
  }

  const assets: { kind: BrandingAssetKind; view: BrandingAssetView; urlKey: keyof typeof form }[] = [
    { kind: "logo", view: branding.logo, urlKey: "logoUrl" },
    { kind: "favicon", view: branding.favicon, urlKey: "faviconUrl" },
    { kind: "login", view: branding.loginImage, urlKey: "loginImageUrl" },
  ];

  return <div className="flex flex-col gap-6">
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={event => {
      event.preventDefault();
      void run("settings", () => saveBrandingAction({ ...form, expectedVersion: branding.version }),
        "Kurum kimliği kaydedildi. Başlık, kurum adı ve tutanak bilgileri güncellendi.");
    }}>
      <label className="text-sm font-medium sm:col-span-1">Uygulama başlığı
        <Input className={fieldClass} required maxLength={200} value={form.siteTitle} disabled={!canManage}
          onChange={e => setForm({ ...form, siteTitle: e.target.value })} />
      </label>
      <label className="text-sm font-medium sm:col-span-1">Kurum adı
        <Input className={fieldClass} required maxLength={200} value={form.institutionName} disabled={!canManage}
          placeholder="T.C. MERSİN BÜYÜKŞEHİR BELEDİYESİ"
          onChange={e => setForm({ ...form, institutionName: e.target.value })} />
      </label>
      <label className="text-sm font-medium sm:col-span-2">Arşiv Dairesi / Alt Birim (Resmi Tutanak Başlığı)
        <Input className={fieldClass} maxLength={200} value={form.departmentName} disabled={!canManage}
          placeholder="Yazı İşleri ve Kararlar Dairesi Başkanlığı · Arşiv Şube Müdürlüğü"
          onChange={e => setForm({ ...form, departmentName: e.target.value })} />
        <span className="mt-1.5 block text-xs font-normal text-muted-foreground">Teslim-tesellüm tutanağında kurum adının altındaki resmi teşkilat başlığı olarak kullanılır.</span>
      </label>
      <label className="text-sm font-medium sm:col-span-2">Açıklama
        <Input className={fieldClass} required maxLength={500} value={form.description} disabled={!canManage}
          onChange={e => setForm({ ...form, description: e.target.value })} />
        <span className="mt-1.5 block text-xs font-normal text-muted-foreground">Tarayıcı üstverisinde ve giriş ekranının altında kullanılır.</span>
      </label>
      {canManage && <div className="sm:col-span-2">
        <Button type="submit" disabled={!!pending}>{pending === "settings" ? "Kaydediliyor…" : "Kurum ve tutanak bilgilerini kaydet"}</Button>
      </div>}
    </form>

    <div className="grid gap-4 lg:grid-cols-3">
      {assets.map(({ kind, view, urlKey }) => {
        const preview = brandingAssetUrl(view);
        return <section key={kind} aria-label={brandingAssetLabels[kind]} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div>
            <h3 className="text-sm font-semibold">{brandingAssetLabels[kind]}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{assetHints[kind]}</p>
          </div>

          <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 p-2">
            {preview
              ? <img src={preview} alt={`${brandingAssetLabels[kind]} önizlemesi`} className="max-h-20 max-w-full object-contain" />
              : <span className="text-xs text-muted-foreground">Görsel yok</span>}
          </div>

          <p className="text-xs text-muted-foreground">
            {view.source === "upload" ? `Yüklenen dosya: ${view.fileName ?? "-"}${view.sizeBytes ? ` · ${Math.ceil(view.sizeBytes / 1024)} KB` : ""}`
              : view.source === "url" ? "Dış adresten alınıyor"
              : "Uygulamayla gelen varsayılan"}
          </p>

          {canManage && <>
            <AssetUpload kind={kind} disabled={!!pending} pending={pending === `upload-${kind}`}
              onUpload={formData => run(`upload-${kind}`, () => uploadBrandingAssetAction(kind, formData),
                `${brandingAssetLabels[kind]} yüklendi.`)} />

            {view.source === "upload" && <Button type="button" variant="outline" size="sm" disabled={!!pending}
              onClick={() => void run(`remove-${kind}`, () => removeBrandingAssetAction(kind),
                `${brandingAssetLabels[kind]} kaldırıldı; varsayılana dönüldü.`)}>
              <RotateCcw className="size-4" aria-hidden />
              {pending === `remove-${kind}` ? "Kaldırılıyor…" : "Yüklenen görseli kaldır"}
            </Button>}

            <label className="text-xs font-medium">Ya da dış adres
              <Input className={fieldClass} type="url" placeholder="https://…" value={form[urlKey]}
                onChange={e => setForm({ ...form, [urlKey]: e.target.value })} />
              <span className="mt-1.5 block font-normal text-muted-foreground">Yukarıdaki kaydet düğmesiyle uygulanır. Yüklenen dosya varsa o önceliklidir.</span>
            </label>
          </>}
        </section>;
      })}
    </div>

    {branding.updatedAt && <p className="text-xs text-muted-foreground">Son değişiklik: {branding.updatedBy} · {new Date(branding.updatedAt).toLocaleString("tr-TR")}</p>}
    {!canManage && <p className="text-sm">Kurum kimliğini yalnız sistem yöneticisi değiştirebilir.</p>}
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</p>}
    {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
  </div>;
}

function AssetUpload({ kind, disabled, pending, onUpload }: {
  kind: BrandingAssetKind; disabled: boolean; pending: boolean; onUpload: (data: FormData) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return <div className="flex flex-col gap-2">
    <input
      ref={input}
      id={`branding-${kind}`}
      type="file"
      accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon,.ico"
      className="sr-only"
      onChange={event => {
        const file = event.target.files?.[0];
        if (!file) return;
        const data = new FormData();
        data.set("file", file);
        onUpload(data);
        // Aynı dosya tekrar seçilebilsin diye alan sıfırlanır.
        if (input.current) input.current.value = "";
      }}
    />
    <Button type="button" size="sm" variant="outline" disabled={disabled}
      onClick={() => input.current?.click()}>
      <Upload className="size-4" aria-hidden />
      {pending ? "Yükleniyor…" : "Görsel yükle"}
    </Button>
    <span className="text-xs text-muted-foreground">PNG, JPEG, SVG, WEBP veya ICO · en fazla 1024 KB</span>
  </div>;
}
