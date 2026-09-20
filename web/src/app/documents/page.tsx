import Link from "next/link";
import { notFound } from "next/navigation";
import { selectArchiveUnit } from "@/features/dossiers/model/archive-unit-selection";
import { getUnitPlanAssignments } from "@/features/organization/api/unit-plans";
import { ChevronLeft, ChevronRight, FileText, Upload, FolderOpen, LayoutGrid, List, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EmptyState, PageHeader, Panel } from "@/components/ui/page";
import {
  documentsPageSize,
  getDocuments,
} from "@/features/documents/api/get-documents";
import { DocumentDetailsPanel } from "@/features/documents/components/document-details-panel";
import { DocumentFilters } from "@/features/documents/components/document-filters";
import { documentStatusLabels } from "@/features/documents/model/document";
import { getArchivePlanScope } from "@/features/dossiers/api/get-archive-plan-scope";
import { ArchiveNavigation } from "@/features/dossiers/components/archive-navigation";
import { DossierBrowser } from "@/features/dossiers/components/dossier-browser";
import { getArchiveUnits, getDossiers, getDossier } from "@/features/dossiers/api/dossiers";
import { getFilePlans, getFilePlanTree } from "@/features/classification/api/get-classification";
import type { FilePlanTree } from "@/features/classification/model/classification";
import { positivePage } from "@/features/documents/components/explorer-pagination";

export const metadata = { title: "Belgeler" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const units = await getArchiveUnits();
  const requestedUnit = single(params.ownerUnitId);
  const activeUnit = selectArchiveUnit(units, requestedUnit);
  if (requestedUnit && !activeUnit) notFound();

  const page = Math.max(1, Number.parseInt(single(params.page) || "1", 10) || 1);
  const criteria = {
    search: single(params.search) || undefined,
    status: single(params.status) || undefined,
    createdFrom: single(params.createdFrom) || undefined,
    createdTo: single(params.createdTo) || undefined,
    sort: single(params.sort) || undefined,
    ownerUnitId: activeUnit?.id,
    filePlanCode: single(params.filePlanCode) || undefined,
    dossierId: single(params.dossierId) || undefined,
    unfiled: single(params.unfiled) || undefined,
    view: single(params.view) === "list" ? "list" : "cards",
    dossierSort: single(params.dossierSort) || "titleAsc",
  };
  const selected = single(params.selected);

  const [documents, plans, dossiers, dossier, assignments] = await Promise.all([
    getDocuments(page, documentsPageSize, criteria), getFilePlans(),
    getDossiers({ sort: criteria.dossierSort, ownerUnitId: criteria.ownerUnitId, filePlanCode: criteria.filePlanCode, year: single(params.year), search: single(params.dossierSearch), page: String(positivePage(params.dossierPage)) }),
    criteria.dossierId ? getDossier(criteria.dossierId) : Promise.resolve(null),
    getUnitPlanAssignments(),
  ]);
  const trees = (await Promise.all(plans.map(p => getFilePlanTree(p.id)))).filter((t): t is FilePlanTree => t !== null);
  const navigationTrees = await getArchivePlanScope(trees, criteria.ownerUnitId, "digital");
  const lastPage = Math.max(1, Math.ceil(documents.totalCount / documentsPageSize));

  // Seçim ve sayfalama bağlantıları aktif süzgeçleri korur.
  const base = new URLSearchParams();
  for (const [key, value] of Object.entries(criteria)) {
    if (value) base.set(key, value);
  }
  for (const key of ["year", "dossierSearch", "dossierPage"]) if (single(params[key])) base.set(key, single(params[key]));
  if (single(params.folderSearch)) base.set("folderSearch", single(params.folderSearch));
  if (positivePage(params.folderPage) > 1) base.set("folderPage", String(positivePage(params.folderPage)));

  function hrefWith(overrides: Record<string, string | null>): string {
    const next = new URLSearchParams(base);
    if (page > 1) next.set("page", String(page));
    if (selected) next.set("selected", selected);

    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }

    return next.size > 0 ? `/documents?${next}` : "/documents";
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tüm Belgeler"
        description="Yetkiniz kapsamındaki belgeleri bulun, inceleyin ve dijital dosyalarınıza erişin."
        actions={activeUnit?.canManageDocuments && <Link href={`/tarama?ownerUnitId=${encodeURIComponent(activeUnit.id)}${dossier ? `&dossierId=${encodeURIComponent(dossier.id)}` : ""}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"><Upload className="size-4" aria-hidden />Belge yükle / tara</Link>}
      />

      <div aria-label="Görüntülenen arşiv kapsamı" className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm"><FolderOpen className="size-5 shrink-0 text-amber-600" aria-hidden /><span className="font-medium">{activeUnit?.name ?? "Yetkim kapsamındaki belgeler"}</span>{criteria.filePlanCode && <><span aria-hidden className="text-muted-foreground">/</span><span>SDP {criteria.filePlanCode}</span></>}{dossier && <><span aria-hidden className="text-muted-foreground">/</span><span>{dossier.year} · {dossier.title}</span></>}<span className="ml-auto text-xs text-muted-foreground">Dijital arşiv</span></div>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* SOL: SÜZGEÇLER */}
        <div className="flex min-w-0 flex-col gap-3">
          <ArchiveNavigation units={units} requireUnit trees={navigationTrees} ownerUnitId={criteria.ownerUnitId} filePlanCode={criteria.filePlanCode} />
        </div>

        {/* ORTA: LİSTE */}
        <div className="flex min-w-0 flex-col gap-4">
          <DocumentFilters key={base.toString()} />
          {(criteria.search || criteria.status || criteria.createdFrom || criteria.createdTo) && <nav aria-label="Uygulanan belge filtreleri" className="flex flex-wrap gap-2">{[{key:"search",value:criteria.search,label:"Başlık"},{key:"status",value:criteria.status,label:"Durum"},{key:"createdFrom",value:criteria.createdFrom,label:"Başlangıç"},{key:"createdTo",value:criteria.createdTo,label:"Bitiş"}].filter(filter=>filter.value).map(filter=><Link key={filter.key} href={hrefWith({[filter.key]:null,page:null,selected:null})} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted" aria-label={`${filter.label} filtresini kaldır`}><span>{filter.label}: {filter.key === "status" ? documentStatusLabels[filter.value!] ?? filter.value : filter.value}</span><span aria-hidden>×</span></Link>)}</nav>}
          <details open={!!dossier || !!criteria.dossierId || !!single(params.dossierSearch) || !!single(params.year)} className="rounded-xl border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-semibold">Dijital dosyalar <span className="ml-2 font-normal text-muted-foreground">{dossier?.title ?? `${dossiers.totalCount} dosya · göz at ve yönet`}</span></summary><div className="mt-4">
          <DossierBrowser assignments={assignments} key={criteria.ownerUnitId ?? "all"} units={units} trees={trees} result={dossiers} selected={dossier} criteria={{ ...criteria, year: single(params.year), dossierSearch: single(params.dossierSearch) }} selectedDocumentId={selected} />
          </div></details>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-base font-semibold">Belgeler <span className="ml-2 rounded-full bg-muted px-2.5 py-1 text-sm tabular-nums">{documents.totalCount.toLocaleString("tr-TR")}</span></h2><p className="mt-2 text-xs text-muted-foreground">{documents.items.length ? `${(page - 1) * documentsPageSize + 1}–${(page - 1) * documentsPageSize + documents.items.length} arası gösteriliyor` : "Seçili kapsam ve filtrelerde sonuç yok"}</p></div>
            <nav aria-label="Belge görünümü" className="flex rounded-lg border border-border bg-card p-1">{[{ value: "cards", label: "Kart", Icon: LayoutGrid }, { value: "list", label: "Liste", Icon: List }].map(({value,label,Icon}) => <Link key={value} href={hrefWith({ view: value })} aria-current={criteria.view === value ? "true" : undefined} className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium hover:bg-muted aria-current:bg-muted"><Icon className="size-4" aria-hidden />{label}</Link>)}</nav>
          </div>

          {documents.items.length === 0 ? (
            <Panel>
              <EmptyState
                icon={FileText}
                title="Belge bulunamadı"
                description="Başlık, tarih veya durum filtrelerini değiştirin. Soldaki birim ve SDP seçimini de kontrol edebilirsiniz."
              />
            </Panel>
          ) : (
            <Panel>
              {criteria.view === "list" ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><caption className="sr-only">Belge sonuçları</caption><thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><tr>{["Belge ve birim","Kayıt tarihi","Durum","Sürüm",""].map((label,index)=><th key={index} scope="col" className="px-4 py-3 font-medium">{label || <span className="sr-only">İşlem</span>}</th>)}</tr></thead><tbody className="divide-y divide-border">{documents.items.map(document=><tr key={document.id} className="align-top hover:bg-muted/30"><td className="max-w-md px-4 py-4"><Link href={`/documents/${encodeURIComponent(document.id)}`} className="flex items-start gap-3 font-semibold leading-6 hover:text-primary"><FileText className="mt-1 size-4 shrink-0 text-primary" aria-hidden /><span className="break-words">{document.title}</span></Link><p className="ml-7 mt-1 text-xs leading-5 text-muted-foreground">{units.find(unit=>unit.id===document.ownerUnitId)?.name ?? "Birim bilgisi yok"}</p></td><td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">{new Date(document.createdAt).toLocaleDateString("tr-TR",{timeZone:"Europe/Istanbul"})}</td><td className="px-4 py-4"><Badge variant="outline" className="whitespace-nowrap">{documentStatusLabels[document.status] ?? document.status}</Badge></td><td className="px-4 py-4 tabular-nums">{document.versionCount}</td><td className="px-4 py-4"><Link href={`/documents/${encodeURIComponent(document.id)}`} aria-label={`${document.title} belgesini aç`} className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-primary hover:underline">İncele<ArrowUpRight className="size-4" aria-hidden /></Link></td></tr>)}</tbody></table></div> : <>
              <ul aria-label="Belge sonuçları" className={criteria.view === "cards" ? "grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2" : "divide-y divide-border"}>
                {documents.items.map(document => <li key={document.id} className={criteria.view === "cards" ? "overflow-hidden rounded-xl border border-border" : undefined}>
                  <Link href={`/documents/${encodeURIComponent(document.id)}`} className={cn("group flex gap-3 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", selected === document.id && "bg-accent")}>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-primary"><FileText className="size-5" aria-hidden /></span>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 break-words text-sm font-semibold leading-6 group-hover:text-primary">{document.title}</h3><Badge variant="outline" className={cn("shrink-0 text-xs", document.status === "Active" && "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200", document.status === "Cancelled" && "text-muted-foreground")}>{documentStatusLabels[document.status] ?? document.status}</Badge></div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">Kayıt: {new Date(document.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Istanbul" })} · {document.versionCount} sürüm</p>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs"><span className="min-w-0 break-words text-muted-foreground">{units.find(unit => unit.id === document.ownerUnitId)?.name ?? ""}</span><span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">Belgeyi aç<ArrowUpRight className="size-3.5" aria-hidden /></span></div></div>
                  </Link>
                </li>)}
              </ul>
              </>}
            </Panel>
          )}

          {lastPage > 1 ? (
            <nav
              aria-label="Belge sayfaları"
              className="flex items-center justify-between gap-2"
            >
              <Link
                href={hrefWith({ page: String(Math.max(1, page - 1)) })}
                tabIndex={page <= 1 ? -1 : undefined}
                aria-disabled={page <= 1}
                className={cn(
                  "inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted",
                  page <= 1 && "pointer-events-none opacity-40",
                )}
              >
                <ChevronLeft className="size-4" aria-hidden />
                Önceki
              </Link>
              <span className="text-sm tabular-nums text-muted-foreground">
                Sayfa {page} / {lastPage}
              </span>
              <Link
                href={hrefWith({ page: String(Math.min(lastPage, page + 1)) })}
                tabIndex={page >= lastPage ? -1 : undefined}
                aria-disabled={page >= lastPage}
                className={cn(
                  "inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted",
                  page >= lastPage && "pointer-events-none opacity-40",
                )}
              >
                Sonraki
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </nav>
          ) : null}
          <Link href={hrefWith({ status: "Cancelled", page: null, selected: null })} className="self-start text-xs text-muted-foreground underline hover:text-foreground">İptal edilen belgeler ve geri alma</Link>
        </div>

        {/* SAĞ: AYRINTI — yalnız seçim varsa yer kaplar */}
        {selected ? (
          <div className="min-w-0 xl:col-start-2">
            <DocumentDetailsPanel documentId={selected} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
