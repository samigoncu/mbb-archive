"use client";
import Link from "next/link";
import type { ArchiveUnit } from "@/features/dossiers/model/dossier";
import type { useScanContext } from "../model/use-scan-context";
const field = "mt-1 block h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";
export function ScanFilingFields({ units, scope, disabled, onUnitChange }: {
  units: ArchiveUnit[]; scope: ReturnType<typeof useScanContext>; disabled: boolean; onUnitChange: (id: string) => void;
}) {
  const physicalFolder = scope.context.folders.find(folder => folder.id === scope.folderId);
  return <fieldset disabled={disabled} className="min-w-0 space-y-3">
    <legend className="sr-only">Birim ve dosyalama</legend>
    <label className="block min-w-0" htmlFor="scan-owner">Sahip birim<select id="scan-owner" className={field} value={scope.ownerUnitId} onChange={e => onUnitChange(e.target.value)}>
      <option value="">Birim seçin</option>{units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
    </select></label>
    {!units.length && <p role="status">Tarama için aktif birim üyeliği ve belge yazma yetkisi gerekir.</p>}
    {scope.loading && <p role="status">Birim dosyaları yükleniyor…</p>}
    {scope.error && <div role="alert">{scope.error}<button type="button" className="ml-2 underline" onClick={() => onUnitChange(scope.ownerUnitId)}>Yeniden dene</button></div>}
    <fieldset disabled={!scope.ownerUnitId || scope.loading || !!scope.error} className="min-w-0 space-y-3">
      <section aria-label="Dijital dosyalama" className="space-y-2 rounded-lg border border-border p-2.5">
      <div><h3 className="font-semibold">Dijital dosyalama</h3></div>
      <label className="block" htmlFor="scan-dossier">Dijital dosya (SDP’ye göre)<select id="scan-dossier" value={scope.dossierId} onChange={e => scope.changeDossier(e.target.value)} className={field}>
        <option value="">— Dijital dosya seçin —</option>
        {scope.context.dossiers.map(d => <option key={d.id} value={d.id}>{d.filePlanCode} · {d.year} · {d.title}</option>)}
      </select></label>
      <label className="block min-w-0" htmlFor="scan-file-plan">Standart Dosya Planı<select id="scan-file-plan" value={scope.selectedClassification} onChange={e => scope.changeClassification(e.target.value)} disabled={!!scope.dossier || !scope.context.classifications.length} className={field}>
        <option value="">— Sınıflandırma yapma —</option>
        {scope.context.classifications.map(c => <option key={c.key} value={c.key}>{c.code} · {c.title} ({c.version})</option>)}
      </select></label>
      <p className="text-xs leading-5 text-muted-foreground">{scope.classification ? `${scope.classification.planName} · ${scope.classification.version}` : "Yalnız seçili birime atanmış, yürürlükteki SDP konuları gösterilir."}</p>
      </section>
      <section aria-label="Fiziksel saklama yeri" className="space-y-2 rounded-lg border border-border p-2.5">
      <div><h3 className="font-semibold">Fiziksel saklama yeri</h3></div>
      <label className="block" htmlFor="scan-folder">Fiziksel klasör (varsa)<select id="scan-folder" value={scope.folderId} onChange={e => scope.changeFolder(e.target.value)} className={field}>
        <option value="">— Fiziksel klasör seçilmedi —</option>
        {scope.folders.map(f => <option key={f.id} value={f.id}>{f.barcode} · {f.title} · {f.locationCode || f.locationName || "Konum belirtilmemiş"}</option>)}
      </select></label>
      {physicalFolder && <dl aria-label="Seçili fiziksel klasörün konumu" className="space-y-2 rounded-md bg-muted/50 p-3 text-xs">
        <div><dt className="text-muted-foreground">Fiziksel klasör</dt><dd className="mt-1 font-medium">{physicalFolder.barcode} · {physicalFolder.title}</dd></div>
        <div><dt className="text-muted-foreground">Kayıtlı fiziksel konum</dt><dd className="mt-1 font-medium">{[physicalFolder.locationCode, physicalFolder.locationName].filter(Boolean).join(" · ") || "Konum belirtilmemiş"}</dd></div>
      </dl>}
      {physicalFolder?.digitalDossierId && scope.dossier && <p role="status" className="text-xs leading-5 text-muted-foreground">Bu fiziksel klasör “{scope.dossier.title}” dijital dosyasına bağlı olduğu için dijital dosyalama alanı otomatik seçildi. Fiziksel konumu yukarıda ayrıca gösterilir.</p>}
      
      </section>
    </fieldset>
    {scope.ownerUnitId && !scope.loading && !scope.error && <Link className="text-xs text-primary underline" href={`/documents?ownerUnitId=${scope.ownerUnitId}`}>{scope.context.dossiers.length ? "Birimin dijital dosyalarını yönet" : "Bu birimde dijital dosya yok — yeni dosya oluştur"}</Link>}
  </fieldset>;
}
