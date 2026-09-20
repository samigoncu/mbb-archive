"use client";
import { useEffect, useState, useTransition } from "react";
import { changeDocumentFilingAction, loadDocumentFilingAction } from "../api/document-filing-actions";
import { LocationPicker } from "@/features/physical-archive/components/location-picker";
import type { FilingEditorData } from "../model/document-filing";
const field = "mt-1 w-full rounded-md border border-border bg-background px-2 py-2 text-xs";

export function DocumentFilingEditor({ documentId, triggerLabel = "Dosyalamayı değiştir", inline = false, physicalOnly = false }: { documentId: string; triggerLabel?: string; inline?: boolean; physicalOnly?: boolean }) {
  const [data, setData] = useState<FilingEditorData | null>(null);
  const [open, setOpen] = useState(inline);
  const [year, setYear] = useState("");
  const [locationId, setLocationId] = useState("");
  const [planKey, setPlanKey] = useState("");
  const [dossierId, setDossierId] = useState("");
  const [folderIds, setFolderIds] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  async function load() {
    const result = await loadDocumentFilingAction(documentId);
    if ("error" in result) { setError(result.error); setData(null); return; }
    const { current, choices } = result.data;
    setData(result.data);
    const dossier = choices.dossiers.find(d => d.id === current.dossierId);
    setPlanKey(choices.classifications.find(c => current.classification
      ? c.planId === current.classification.planId && c.itemId === current.classification.itemId
      : dossier ? c.planId === dossier.filePlanId && c.itemId === dossier.filePlanItemId : c.code === current.filePlanCode)?.key ?? "");
    setDossierId(current.dossierId ?? ""); setFolderIds(current.folders.map(f => f.id)); setReason("");
  }
  useEffect(() => { if (inline) startTransition(load); }, [documentId, inline]);
  const classification = data?.choices.classifications.find(c => c.key === planKey);
  const dossiers = data?.choices.dossiers.filter(d => d.filePlanId === classification?.planId && d.filePlanItemId === classification.itemId) ?? [];
  const folders = data?.choices.folders.filter(f => f.filePlanCode === classification?.code && (!f.digitalDossierId || f.digitalDossierId === dossierId)) ?? [];
  const visibleFolders = locationId ? folders.filter(f => f.locationId === locationId) : [];
  const selectedFolders = folders.filter(f => folderIds.includes(f.id));
  const invalidFolders = data?.current.folders.filter(f => folderIds.includes(f.id) && !folders.some(choice => choice.id === f.id)) ?? [];
  const invalidDossier = !!dossierId && !dossiers.some(d => d.id === dossierId);
  return <section className="border-t border-border pt-3 text-xs">
    {!inline && <button type="button" className="font-semibold text-primary underline" disabled={pending} aria-expanded={open}
      onClick={() => { setOpen(!open); setError(""); if (!open) startTransition(load); }}>{triggerLabel}</button>}
    {message && <p role="status" className="mt-2 text-emerald-700">{message}</p>}
    {open && <div className="mt-3 space-y-3">
      <p className="text-muted-foreground">{physicalOnly ? "Belgeyi yerleştireceğiniz dolap, raf ve fiziksel klasörü seçin. Sanal dosyalama bu işlemde korunur." : "Standart dosya planını ve sanal dosyayı seçin. Fiziksel bağlantısı varsa yeni dosyalamayla uyumlu klasörleri de seçin."}</p>
      {physicalOnly && data && !classification && <p role="alert">Önce Sanal dosyalama sekmesinden SDP konusu seçip kaydedin.</p>}
      {pending && <p role="status">İşlem sürüyor…</p>}
      {error && <div role="alert" className="text-destructive">{error}<button className="ml-2 underline" type="button" disabled={pending} onClick={() => { setError(""); startTransition(load); }}>Bilgileri yenile</button></div>}
      {data && <form onSubmit={event => {
        event.preventDefault(); if (!classification || invalidDossier || invalidFolders.length) return;
        setError(""); setMessage("");
        startTransition(async () => {
          const result = await changeDocumentFilingAction(documentId, { expectedVersion: data.current.version,
            dossierId: dossierId || null, filePlanId: classification.planId, filePlanItemId: classification.itemId,
            expectedFolderIds: data.current.folders.map(f => f.id), folderIds, reason });
          if ("error" in result) { setError(result.error); return; }
          await load(); setMessage("SDP, dijital dosya ve fiziksel klasör bağlantıları kaydedildi.");
        });
      }}>
        <fieldset disabled={pending} className="space-y-3">
          {data.choices.dossiers[0]?.ownerUnitName && <p>Birim: <strong>{data.choices.dossiers[0].ownerUnitName}</strong></p>}
          <p>Mevcut SDP: <strong>{data.current.filePlanCode ?? "Atanmamış"}</strong></p>
          <p>Mevcut fiziksel klasör: <strong>{data.current.folders.map(f => `${f.barcode} · ${f.title}`).join(", ") || "Bağlantı yok"}</strong></p>
          {!physicalOnly && <><label className="block">Standart Dosya Planı (SDP)
            <select aria-label="Standart Dosya Planı (SDP)" className={field} required value={planKey} onChange={e => { setPlanKey(e.target.value); setYear(""); setDossierId(""); setFolderIds([]); }}>
              <option value="">SDP konusu seçin</option>{data.choices.classifications.map(c => <option key={c.key} value={c.key}>{c.code} · {c.title} ({c.version})</option>)}
            </select>
          </label>
          <label className="block">Dosya yılı
            <select aria-label="Dosya yılı" className={field} value={year} onChange={e => setYear(e.target.value)}>
              <option value="">Tüm yıllar</option>
              {[...new Set(dossiers.map(d => d.year))].sort((a,b) => b-a).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="block">Sanal dosya (dijital dosya)
            <select aria-label="Dijital dosya" className={field} value={dossierId} onChange={e => { setDossierId(e.target.value); setFolderIds([]); }}>
              <option value="">Dijital dosyaya bağlama</option>
              {invalidDossier && <option value={dossierId} disabled>Mevcut dosya artık seçilebilir değil — yeni seçim yapın</option>}
              {dossiers.filter(d => !year || String(d.year) === year || d.id === dossierId).map(d => <option key={d.id} value={d.id}>{d.year} · {d.title}</option>)}
            </select>
          </label>
          </>}
          <fieldset className="space-y-2"><legend className="mb-1 font-medium">Fiziksel klasörler (varsa)</legend>
            {!folders.length && <p className="text-muted-foreground">Seçilen SDP ve dijital dosyaya uygun fiziksel klasör yok.</p>}
            {data.locationError && <p role="alert" className="text-destructive">{data.locationError}</p>}
            {!!data.locations?.length && <LocationPicker locations={data.locations.filter(l => l.isActive)} name="filing-location" onLocationChange={setLocationId} />}
            <p className="text-muted-foreground">Rafı veya kutuyu seçin; o konumdaki uygun klasörler aşağıda listelenir.</p>
            {locationId && !visibleFolders.length && <p>Bu konumda seçilen dosyalamaya uygun klasör yok.</p>}
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {[...new Map([...visibleFolders, ...selectedFolders, ...invalidFolders].map(f => [f.id, f])).values()].map(f => <label key={f.id} className="flex items-start gap-2">
                <input type="checkbox" className="mt-0.5" checked={folderIds.includes(f.id)} onChange={e => setFolderIds(e.target.checked ? [...folderIds, f.id] : folderIds.filter(id => id !== f.id))} />
                <span>{f.barcode} · {f.title}{invalidFolders.some(x => x.id === f.id) ? " — yeni seçimle uyumsuz, bağlantıyı kaldırın" : ""}</span>
              </label>)}
            </div>
          </fieldset>
          <p className="text-muted-foreground">SDP veya dijital dosya değişince fiziksel klasörleri yeniden seçin. Boş bırakmak mevcut fiziksel bağlantıları kaldırır; kağıt belgeyi yerinden taşımaz.</p>
          <label className="block">Değişiklik gerekçesi<textarea aria-label="Değişiklik gerekçesi" className={field} required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /></label>
          <button type="submit" disabled={!classification || invalidDossier || !!invalidFolders.length || !reason.trim()} className="rounded-md bg-primary px-3 py-2 font-semibold text-primary-foreground disabled:opacity-50">Dosyalamayı kaydet</button>
        </fieldset>
      </form>}
    </div>}
  </section>;
}
