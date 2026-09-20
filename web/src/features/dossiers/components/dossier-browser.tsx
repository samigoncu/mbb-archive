import { DossierImport } from "./dossier-import";
import Link from "next/link";
import { DossierCreateForm } from "./dossier-create-form";
import type { UnitPlanAssignment } from "@/features/organization/model/unit-plans";
import { ActionForm } from "@/components/action-form";
import { Panel } from "@/components/ui/page";
import { fileDocumentAction, renameDossierAction } from "../api/dossier-actions";
import type { ArchiveUnit, DigitalDossier } from "../model/dossier";
import type { FilePlanTree } from "@/features/classification/model/classification";
import type { PagedResult } from "@/features/documents/model/document";

export function DossierBrowser({ units, trees, result, selected, criteria, selectedDocumentId, assignments }: {
  assignments: UnitPlanAssignment[];
  units: ArchiveUnit[]; trees: FilePlanTree[]; result: PagedResult<DigitalDossier>;
  selected?: DigitalDossier | null; criteria: Record<string, string | undefined>; selectedDocumentId?: string;
}) {
  const writable = units.filter(u => u.isActive && u.canManageDocuments);
  const canWriteSelected = selected && writable.some(u => u.id === selected.ownerUnitId);
  function href(values: Record<string, string>) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(criteria)) if (v && k !== "dossierId") p.set(k, v);
    for (const [k, v] of Object.entries(values)) p.set(k, v);
    return `/documents?${p}`;
  }
  const today = new Date().toISOString().slice(0, 10);
  const activeTrees = trees.filter(t => t.effectiveFrom <= today && (!t.effectiveTo || t.effectiveTo >= today));
  return <Panel title={selected ? `${selected.ownerUnitName} / ${selected.filePlanCode} / ${selected.year} / ${selected.title}` : "Dijital dosyalar"} padded>
    <p className="mb-3 text-xs text-muted-foreground">Birim → Standart Dosya Planı → yıl / iş dosyası → belgeler. Fiziksel klasör oluşturmanız gerekmez.</p>
    <nav aria-label="Arşiv görünümü" className="mb-4 flex gap-2 text-xs">
      <Link href={href({ ...(selected ? {dossierId:selected.id} : {}), view:"cards" })} aria-current={criteria.view !== "list" ? "true" : undefined} className="rounded border px-3 py-2 aria-current:bg-muted">Kart görünümü</Link>
      <Link href={href({ ...(selected ? {dossierId:selected.id} : {}), view:"list" })} aria-current={criteria.view === "list" ? "true" : undefined} className="rounded border px-3 py-2 aria-current:bg-muted">Liste görünümü</Link>
    </nav>
    {selected ? <div className="flex flex-wrap items-center gap-3 text-sm">
      <Link href={href({})} className="text-primary underline">Dosya seçimini kaldır</Link>
      {canWriteSelected && <Link href={`/tarama?dossierId=${selected.id}`} className="rounded bg-primary px-3 py-2 text-primary-foreground">Bu dosyaya belge yükle / tara</Link>}
      <Link href={`/dosya-islemleri?ownerUnitId=${selected.ownerUnitId}&digitalDossierId=${selected.id}`} className="text-primary underline">Fiziksel karşılıkları</Link>
      <span className="text-muted-foreground">Plan sürümü: {selected.filePlanVersion}</span>
      {canWriteSelected && <>
        <details className="basis-full rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Klasör adını düzenle</summary><div className="mt-3"><ActionForm action={renameDossierAction} label="Adı kaydet"><input type="hidden" name="dossierId" value={selected.id} /><input type="hidden" name="expectedTitle" value={selected.title} /><label>Klasör adı<input name="title" required maxLength={300} defaultValue={selected.title} className="mt-1 block w-full rounded border bg-background p-2" /></label></ActionForm></div></details>
        <DossierImport id={selected.id} />
      </>}
    </div> : <>
      <form className="mb-3 flex flex-wrap items-end gap-2">
        {Object.entries(criteria).filter(([k, v]) => v && !["dossierSearch", "year", "dossierSort", "view", "dossierPage"].includes(k)).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <label className="text-xs">Dosya başlığı<input name="dossierSearch" defaultValue={criteria.dossierSearch} className="block rounded border bg-background p-2" /></label>
        <label className="text-xs">Yıl<input name="year" type="number" min="1900" max="9999" defaultValue={criteria.year} className="block w-24 rounded border bg-background p-2" /></label>
        <label className="text-xs">Sıralama<select name="dossierSort" defaultValue={criteria.dossierSort ?? "titleAsc"} className="block rounded border bg-background p-2"><option value="titleAsc">Ad (A–Z)</option><option value="titleDesc">Ad (Z–A)</option><option value="newest">En yeni önce</option><option value="oldest">En eski önce</option></select></label>
        <label className="text-xs">Görünüm<select name="view" defaultValue={criteria.view ?? "cards"} className="block rounded border bg-background p-2"><option value="cards">Kart</option><option value="list">Liste</option></select></label>
        <button className="rounded border px-3 py-2 text-xs">Uygula</button>
      </form>
      <ul className={criteria.view === "list" ? "space-y-2" : "grid gap-2 md:grid-cols-2"}>{result.items.map(d => <li key={d.id} className="rounded border p-3">
        <Link href={href({ dossierId: d.id, ownerUnitId: d.ownerUnitId, filePlanCode: d.filePlanCode })} className="font-medium text-primary hover:underline">{d.title}</Link>
        <p className="text-xs text-muted-foreground">{d.ownerUnitName} · {d.filePlanCode} — {d.filePlanTitle} · {d.year} · {d.documentCount} belge</p>
        {selectedDocumentId && writable.some(u => u.id === d.ownerUnitId) && <details className="mt-2 text-xs"><summary>Seçili belgeyi bu dosyaya yerleştir</summary><ActionForm action={fileDocumentAction} label="Yerleştir"><input type="hidden" name="documentId" value={selectedDocumentId} /><input type="hidden" name="dossierId" value={d.id} /></ActionForm></details>}
      </li>)}</ul>
      {!result.items.length && <p className="py-3 text-sm text-muted-foreground">Bu kapsamda dijital dosya yok. Belgeler aşağıda listelenir.</p>}
      <nav aria-label="Dijital dosya sayfaları" className="my-3 flex gap-4 text-xs"><span>{result.totalCount} dosya · Sayfa {result.page}</span>{result.page > 1 && <Link href={href({ dossierPage: String(result.page - 1) })}>Önceki</Link>}{result.page * result.pageSize < result.totalCount && <Link href={href({ dossierPage: String(result.page + 1) })}>Sonraki</Link>}</nav>
    </>}
    {writable.length > 0 && <details className="mt-4 border-t pt-3"><summary className="cursor-pointer text-sm font-medium">Yeni dijital dosya</summary>
      <div className="mt-3 max-w-lg"><DossierCreateForm units={writable} trees={activeTrees} assignments={assignments} initialUnitId={criteria.ownerUnitId} /></div>
    </details>}
  </Panel>;
}
