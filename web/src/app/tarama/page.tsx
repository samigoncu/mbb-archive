import Link from "next/link";
import { Activity } from "lucide-react";
import { getUploadPolicy } from "@/features/settings/api/upload-policy";
import { notFound } from "next/navigation";
import { getArchiveUnits, getDossier } from "@/features/dossiers/api/dossiers";
import { apiGet, ApiError } from "@/lib/api/api-client";
import { whenPermitted } from "@/lib/api/when-permitted";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import { getPublishedMetadataSchemas } from "@/features/classification/api/get-classification";
import { ScanIndexingStudio } from "@/features/scanning/components/scan-indexing-studio";
import { getScanContext } from "@/features/scanning/api/get-scan-context";
import { writableScanUnits } from "@/features/scanning/model/scan-context";
import { PageHeader } from "@/components/ui/page";
import { ScanScopeNotice, scanScopeProblem } from "@/features/scanning/components/scan-scope-notice";
import { ScanBatchReceiptDialog } from "@/features/scanning/components/scan-batch-receipt-dialog";

export const metadata = { title: "Tarama ve İndeksleme" };

export default async function TaramaPage({ searchParams }: {
  searchParams: Promise<{ folderId?: string; dossierId?: string; ownerUnitId?: string }>;
}) {
  const params = await searchParams;
  const units = writableScanUnits(await getArchiveUnits());
  let folder: FolderListItem | null = null;
  let dossier = null;
  try {
    folder = params.folderId ? await apiGet<FolderListItem>(`/physical-archive/folders/${encodeURIComponent(params.folderId)}`, { cache: "no-store" }) : null;
    const dossierId = params.dossierId || folder?.digitalDossierId;
    dossier = dossierId ? await getDossier(dossierId) : null;
  } catch (error) {
    if (error instanceof ApiError && [403, 404].includes(error.status)) notFound();
    throw error;
  }
  const ownerUnitId = params.ownerUnitId || dossier?.ownerUnitId || folder?.ownerUnitId || units.find(u => u.isPrimary)?.id || (units.length === 1 ? units[0].id : "");
  if ((ownerUnitId && !units.some(u => u.id === ownerUnitId)) ||
      (folder && folder.ownerUnitId !== ownerUnitId) || (dossier && dossier.ownerUnitId !== ownerUnitId) ||
      (folder?.digitalDossierId && dossier?.id !== folder.digitalDossierId)) notFound();
  const [context, metadataSchemas, uploadPolicy] = await Promise.all([
    getScanContext(ownerUnitId), whenPermitted(getPublishedMetadataSchemas(), []), getUploadPolicy(),
  ]);
  const currentUnit = units.find(u => u.id === ownerUnitId);
  const problem = scanScopeProblem(context, folder, dossier);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tarama ve İndeksleme"
        actions={
          <div className="flex items-center gap-2">
            <ScanBatchReceiptDialog
              unitName={currentUnit?.name}
              folderCode={folder?.barcode}
            />
            <Link
              href="/islem-takibi"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Activity className="size-4" aria-hidden />
              İşlem takibi
            </Link>
          </div>
        }
      />
      {problem ? (
        <ScanScopeNotice problem={problem} />
      ) : (
        <ScanIndexingStudio
          key={`${ownerUnitId}/${dossier?.id ?? ""}/${folder?.id ?? ""}`}
          units={units}
          initialContext={context}
          initialDossierId={dossier?.id}
          initialFolderId={folder?.id}
          metadataSchemas={metadataSchemas}
          maxUploadBytes={uploadPolicy.maxUploadBytes}
        />
      )}
    </div>
  );
}
