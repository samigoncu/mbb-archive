import { getUnitPlanAssignments } from "@/features/organization/api/unit-plans";
import { getArchivePlanScope } from "@/features/dossiers/api/get-archive-plan-scope";
import { ArchiveNavigation } from "@/features/dossiers/components/archive-navigation";
import { getArchiveUnits, getDossier } from "@/features/dossiers/api/dossiers";
import type { FilePlanTree } from "@/features/classification/model/classification";
import { getFolders } from "@/features/physical-archive/api/get-folders";
import { getLocations } from "@/features/physical-archive/api/get-locations";
import {
  getFilePlans,
  getFilePlanTree,
} from "@/features/classification/api/get-classification";
import { DossierOperationsView } from "@/features/physical-archive/components/dossier-operations-view";

export const metadata = { title: "Dosya İşlemleri" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DosyaIslemleriPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number.parseInt(String(params.page ?? "1"), 10) || 1;

  const filters = Object.fromEntries(
    ["title", "barcode", "filePlanCode", "status", "ownerUnitId", "digitalDossierId"].map((key) => [
      key,
      typeof params[key] === "string" ? params[key] : "",
    ]),
  );
  const [folders, locations, filePlans, units, digitalDossier, assignments] = await Promise.all([
    getFolders(page, 100, filters),
    getLocations(),
    getFilePlans(), getArchiveUnits(),
    filters.digitalDossierId ? getDossier(filters.digitalDossierId) : Promise.resolve(null),
    getUnitPlanAssignments(),
  ]);

  const trees = await Promise.all(
    filePlans.filter((p) => p.isActive).map((p) => getFilePlanTree(p.id)),
  );
  const navigationTrees = await getArchivePlanScope(trees.filter((tree): tree is FilePlanTree => tree !== null), filters.ownerUnitId, "physical");
  const nodes = trees
    .flatMap((tree) => tree?.items ?? [])
    .filter((n) => n.isActive && n.isSelectable);

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
    <ArchiveNavigation units={units} trees={navigationTrees} ownerUnitId={filters.ownerUnitId} filePlanCode={filters.filePlanCode} basePath="/dosya-islemleri" />
    <DossierOperationsView assignments={assignments} key={filters.ownerUnitId || "all"} units={units} digitalDossier={digitalDossier}
      initialFolders={folders.items}
      locations={locations}
      nodes={nodes}
      filters={filters}
      page={page}
      totalCount={folders.totalCount}
    /></div>
  );
}
