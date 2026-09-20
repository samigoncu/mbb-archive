import { getLocations } from "@/features/physical-archive/api/get-locations";
import { locationPath } from "@/features/physical-archive/model/location-path";
import { folderStatusLabels, type FolderStatus } from "@/features/physical-archive/model/folder";
import { whenPermitted } from "@/lib/api/when-permitted";
import Link from "next/link";
import { notFound } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api/api-client";
import { PageHeader } from "@/components/ui/page";
import { ArchiveNavigation } from "@/features/dossiers/components/archive-navigation";
import { getArchiveUnits } from "@/features/dossiers/api/dossiers";
import { getFilePlans, getFilePlanTree } from "@/features/classification/api/get-classification";
import type { FilePlanTree } from "@/features/classification/model/classification";
import { getLinkedDocuments } from "@/features/documents/api/get-linked-documents";
import { positivePage } from "@/features/documents/components/explorer-pagination";
import { DocumentDetailsPanel } from "@/features/documents/components/document-details-panel";
import { DossierWorkspaceTabs } from "@/features/dossiers/components/dossier-workspace-tabs";

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const folder = await apiGet<{
    id: string;
    barcode: string;
    title: string;
    filePlanCode: string;
    documentIds: string[];
    locationId: string;
    status: FolderStatus;
    ownerUnitId: string | null;
    digitalDossierId: string | null;
    dispositions: { documentId: string; processId: string; executedAt: string; actor: string; protocolReference: string; evidenceDocumentId: string }[];
  }>(`/physical-archive/folders/${encodeURIComponent(id)}`, { cache: "no-store" }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const [units, plans, locations] = await Promise.all([getArchiveUnits(), getFilePlans(), whenPermitted(getLocations(), [])]);
  const trees = (await Promise.all(plans.map(p => getFilePlanTree(p.id)))).filter((t): t is FilePlanTree => t !== null);
  const owner = units.find(u => u.id === folder.ownerUnitId);
  const totalPages = Math.max(1, Math.ceil(folder.documentIds.length / 25));
  const page = Math.min(positivePage(query.page), totalPages);
  const documents = await getLinkedDocuments(folder.documentIds.slice((page - 1) * 25, page * 25));
  const selected = typeof query.selected === "string" && documents.some((doc) => doc.id === query.selected && doc.details) ? query.selected : undefined;
  const folderPage = positivePage(query.folderPage);
  const folderSearch = typeof query.folderSearch === "string" ? query.folderSearch : "";
  const basePath = `/dosya-islemleri/${folder.id}`;
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Klasör yolu" className="flex flex-wrap gap-2 text-sm text-muted-foreground">
        <Link href={`/dosya-islemleri?ownerUnitId=${folder.ownerUnitId ?? ""}`} className="text-primary hover:underline">{owner?.name ?? "Birim ataması bekliyor"}</Link>
        <span aria-hidden>/</span><span>{folder.filePlanCode}</span>
        <span aria-hidden>/</span><span aria-current="page">{folder.title}</span>
      </nav>
      <PageHeader title={folder.title} description={`${folder.barcode} · ${folder.filePlanCode}`} actions={
        owner?.canManagePhysical && owner.canManageDocuments ? <Link href={`/tarama?folderId=${folder.id}`} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground">Bu dosyaya tara ve indeksle</Link> : undefined
      } />
      <section aria-label="Fiziksel dosya özeti" className="grid gap-3 sm:grid-cols-3">
        {[{label:"Fiziksel konum",value:locationPath(locations, folder.locationId, "Konum bilgisine erişilemiyor")},{label:"Standart Dosya Planı",value:folder.filePlanCode},{label:"Klasör durumu",value:folderStatusLabels[folder.status] ?? folder.status}].map(item => <div key={item.label} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-2 text-sm font-medium leading-6">{item.value}</p></div>)}
      </section>
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <ArchiveNavigation units={units} trees={trees} ownerUnitId={folder.ownerUnitId ?? undefined} filePlanCode={folder.filePlanCode} basePath="/dosya-islemleri" />
          {folder.digitalDossierId && <Link href={`/documents?dossierId=${folder.digitalDossierId}&ownerUnitId=${folder.ownerUnitId ?? ""}`} className="mt-3 block text-sm text-primary underline">Dijital dosyayı aç</Link>}
          <Link href="/dosya-islemleri" className="mt-3 block text-xs text-primary hover:underline">Dosya işlemlerine dön</Link>
        </aside>
        <div className="min-w-0">
          <DossierWorkspaceTabs
            folder={folder}
            owner={owner}
            documents={documents}
            page={page}
            totalPages={totalPages}
            selected={selected}
            detailsPanel={selected ? <DocumentDetailsPanel documentId={selected} /> : null}
            navigation={{ basePath, folderPage, folderSearch }}
          />
        </div>
      </div>
    </div>
  );
}
