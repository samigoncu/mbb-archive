import { MapPin, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { locationPath } from "../model/location-path";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { assignPhysicalOwnerAction } from "@/features/dossiers/api/dossier-actions";
import { PageHeader, Panel, EmptyState } from "@/components/ui/page";
import { NewFolderDialog, MoveFolderDialog } from "./folder-dialogs";
import {
  folderStatusLabels,
  type FolderListItem,
  type FolderFilters,
} from "../model/folder";
import type { LocationListItem } from "../model/location";
import type { FilePlanNode } from "@/features/classification/model/classification";
import { ExportCsvButton } from "@/components/export-csv-button";

export function DossierOperationsView({
  initialFolders, units, digitalDossier, assignments,
  locations,
  nodes,
  filters,
  page,
  totalCount,
}: {
  assignments: import("@/features/organization/model/unit-plans").UnitPlanAssignment[];
  initialFolders: FolderListItem[];
  units: import("@/features/dossiers/model/dossier").ArchiveUnit[];
  digitalDossier?: import("@/features/dossiers/model/dossier").DigitalDossier | null;
  locations: LocationListItem[];
  nodes: FilePlanNode[];
  filters: FolderFilters;
  page: number;
  totalCount: number;
}) {
  const href = (next: number) =>
    `/dosya-islemleri?${new URLSearchParams({ ...filters, page: String(next) })}`;
  const clear = new URLSearchParams();
  for (const key of ["ownerUnitId", "digitalDossierId"] as const) if (filters[key]) clear.set(key, filters[key]!);
  /** Klasörün SDP konusu, sahibi birime atanmış ve yürürlükteki bir planda mı? */
  const scannable = (folder: FolderListItem) =>
    !!folder.ownerUnitId && assignments.some(item =>
      item.unitId === folder.ownerUnitId
      && item.code === folder.filePlanCode
      && nodes.some(node => node.id === item.itemId));

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PageHeader
        title="Fiziksel Dosyalar"
        description="Fiziksel dosyaları dosya planı, konum ve durumuna göre bulun; içeriklerine erişin."
        actions={units.some(u => u.canManagePhysical && u.isActive) ? <NewFolderDialog assignments={assignments} ownerUnitId={filters.ownerUnitId} locations={locations} nodes={nodes} units={units} digitalDossier={digitalDossier} /> : undefined}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm"><div className="flex items-start gap-2"><FolderOpen className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden /><div><p className="font-medium">{units.find(u => u.id === filters.ownerUnitId)?.name ?? "Yetkim kapsamındaki fiziksel dosyalar"}</p><p className="mt-1 text-xs text-muted-foreground">{digitalDossier ? `Dijital dosya: ${digitalDossier.title}` : "SDP konuya göre dosyalamayı; konum, fiziksel saklama yerini gösterir."}</p></div></div><Link href="/arsiv-yerlesimi" className="inline-flex items-center gap-1.5 text-primary hover:underline"><MapPin className="size-4" aria-hidden />Arşiv yerleşimi</Link></div>
      <Panel title="Dosya arama ve filtreler" padded>
        <form aria-label="Fiziksel dosya filtreleri" className="grid items-end gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {filters.ownerUnitId && <input type="hidden" name="ownerUnitId" value={filters.ownerUnitId} />}
          {filters.digitalDossierId && <input type="hidden" name="digitalDossierId" value={filters.digitalDossierId} />}
          <label className="text-sm">
            Dosya planı
            <select
              className="mt-1.5 block h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm"
              name="filePlanCode"
              defaultValue={filters.filePlanCode}
            >
              <option value="">Tüm kodlar</option>
              {nodes.map((node) => (
                <option key={node.id} value={node.code}>
                  {node.code} · {node.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Başlık
            <input
              className="mt-1.5 block h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm"
              name="title"
              defaultValue={filters.title}
            />
          </label>
          <label className="text-sm">
            Barkod
            <input
              className="mt-1.5 block h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm"
              name="barcode"
              defaultValue={filters.barcode}
            />
          </label>
          <label className="text-sm">
            Durum
            <select
              className="mt-1.5 block h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm"
              name="status"
              defaultValue={filters.status}
            >
              <option value="">Tümü</option>
              {Object.entries(folderStatusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded bg-primary px-4 py-2 text-primary-foreground">
            Filtrele
          </button>
          <Link href={`/dosya-islemleri?${clear}`} className="rounded-lg border border-border px-4 py-2 text-center text-sm hover:bg-muted">Filtreleri temizle</Link>
        </form>
      </Panel>
      <Panel
        title={`${totalCount.toLocaleString("tr-TR")} fiziksel dosya`}
        description="Konum yolu kayıtlı arşiv hiyerarşisini gösterir. CSV yalnız bu sayfadaki dosyaları içerir."
        actions={
          <ExportCsvButton
            name="dosyalar"
            headers={[
              "Barkod",
              "Başlık",
              "Dosya planı",
              "Konum",
              "Durum",
              "Belge",
            ]}
            rows={initialFolders.map((f) => [
              f.barcode,
              f.title,
              f.filePlanCode,
              locationPath(locations, f.locationId, f.locationName),
              folderStatusLabels[f.status],
              f.documentCount,
            ])}
          />
        }
      >
        {initialFolders.length === 0 ? (
          <EmptyState
            title="Bu filtrede dosya yok"
            description="Başlık, barkod veya durum filtrelerini değiştirin; seçili birim ve SDP kapsamını kontrol edin."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr className="border-b">
                  <th scope="col" className="p-4 font-medium">Barkod / Başlık</th>
                  <th scope="col" className="p-3 font-medium">Birim / SDP</th>
                  <th scope="col" className="p-3 font-medium">Fiziksel konum</th>
                  <th scope="col" className="p-3 font-medium">Durum</th>
                  <th scope="col" className="p-3 font-medium">Belge</th>
                  <th scope="col" className="p-3 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {initialFolders.map((f) => (
                  <tr key={f.id} className="border-b border-border align-top last:border-0 hover:bg-muted/25">
                    <td className="max-w-72 p-4">
                      <Link
                        className="font-semibold leading-6 text-foreground hover:text-primary hover:underline"
                        href={`/dosya-islemleri/${f.id}`}
                      >
                        {f.title}
                      </Link>
                      <div className="mt-1 font-mono text-xs text-muted-foreground">{f.barcode}</div>
                    </td>
                    <td className="max-w-64 p-3 text-xs leading-5"><div>{units.find(u => u.id === f.ownerUnitId)?.name ?? "Birim ataması bekliyor"}</div>{f.filePlanCode}</td>
                    <td className="max-w-72 p-3 text-xs leading-6"><p>{locationPath(locations, f.locationId, f.locationName)}</p><p className="mt-1 font-mono text-muted-foreground">{f.locationCode}</p></td>
                    <td className="p-3"><Badge variant="outline" className="whitespace-nowrap">{folderStatusLabels[f.status]}</Badge></td>
                    <td className="p-3 tabular-nums">{f.documentCount}</td>
                    <td className="space-y-3 p-3 text-xs">
                      {!f.ownerUnitId && units.some(u => u.canManagePhysical && u.isActive) && <details><summary className="cursor-pointer text-xs">Birim ata</summary><ActionForm action={assignPhysicalOwnerAction} label="Birim ata"><input type="hidden" name="folderId" value={f.id} /><select name="ownerUnitId" required>{units.filter(u => u.canManagePhysical && u.isActive).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></ActionForm></details>}
                      {units.some(u => u.id === f.ownerUnitId && u.isActive && u.canManagePhysical && u.canManageDocuments) && (
                        // Yürürlükten kalkmış SDP konusundaki klasörde tarama
                        // başlatılamaz; bağlantıyı açık bırakmak kullanıcıyı
                        // boşuna gezdirirdi.
                        scannable(f) ? <Link
                          href={`/tarama?folderId=${f.id}`}
                          className="text-primary underline"
                        >
                          Tara ve indeksle
                        </Link> : <span className="text-muted-foreground" title={`${f.filePlanCode} konusu birime atanmamış ya da SDP sürümü yürürlükten kalkmış.`}>
                          Tarama yapılamıyor
                        </span>
                      )}
                      {f.status === "Available" && units.some(u => u.id === f.ownerUnitId && u.canManagePhysical) && (
                        <MoveFolderDialog
                          folderId={f.id}
                          folderBarcode={f.barcode}
                          currentLocationId={f.locationId}
                          locations={locations}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <nav aria-label="Sayfalama" className="flex flex-wrap items-center justify-end gap-4 rounded-lg border border-border bg-card p-3 text-sm">
        <span className="mr-auto text-muted-foreground">Sayfa {page} / {Math.max(1, Math.ceil(totalCount / 100))}</span>
        {page > 1 && <Link href={href(page - 1)}>Önceki</Link>}
        {page * 100 < totalCount && <Link href={href(page + 1)}>Sonraki</Link>}
      </nav>
    </div>
  );
}
