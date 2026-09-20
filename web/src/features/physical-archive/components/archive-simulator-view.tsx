"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  HardDrive,
  Layers,
  MapPin,
  QrCode,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";
import { moveFolderAction } from "@/features/physical-archive/api/folder-actions";
import type { LocationOccupancyItem } from "@/features/physical-archive/api/get-occupancy";
import {
  folderStatusLabels,
  type FolderListItem,
} from "@/features/physical-archive/model/folder";

/** Dosya taşınabilen uç düğümler; bunların üstündeki düğüm bir "dolap" sayılır. */
const shelfTypes = new Set(["Shelf", "Box"]);

type SimulatorShelf = {
  id: string;
  code: string;
  name: string;
  capacity: number | null;
  /** Yerleşim doluluğundan gelen kesin sayı. */
  folderCount: number;
  folders: FolderListItem[];
};

type SimulatorUnit = {
  id: string;
  code: string;
  name: string;
  /** Kök konumdan bu dolaba kadar olan üst düğüm adları. */
  path: string;
  capacity: number | null;
  used: number;
  shelves: SimulatorShelf[];
};

const initialState: ActionState = { status: "idle" };

export function ArchiveSimulatorView({
  locations,
  folders,
}: {
  locations: LocationOccupancyItem[];
  folders: FolderListItem[];
}) {
  const units = useMemo(
    () => buildUnits(locations, folders),
    [locations, folders],
  );

  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [destination, setDestination] = useState("");
  const [state, action, pending] = useActionState(moveFolderAction, initialState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setSelectedFolderId("");
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  // Seçim sunucu verisi yenilendiğinde geçersiz kalabilir; en dolu dolaba düşülür.
  const selectedUnit =
    units.find((unit) => unit.id === selectedUnitId) ?? units[0] ?? null;

  const selectedFolder = selectedUnit?.shelves
    .flatMap((shelf) => shelf.folders)
    .find((folder) => folder.id === selectedFolderId);

  const placedCount = locations.reduce((sum, l) => sum + l.folderCount, 0);
  const shelfCount = units.reduce((sum, unit) => sum + unit.shelves.length, 0);

  if (units.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center text-muted-foreground">
        <HardDrive className="size-12 mx-auto text-primary/40 mb-3" />
        <h3 className="text-base font-bold text-foreground">
          Kayıtlı Fiziksel Arşiv Yerleşimi Yok
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          Sistemde henüz dosya yerleştirilebilecek bir raf veya kutu tanımlı değil.
          Simülatörün çalışması için yerleşim hiyerarşisi oluşturun.
        </p>
        <Link
          href="/arsiv-yerlesimi"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm"
        >
          Arşiv yerleşimine git →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ÖZET ŞERİDİ */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <HardDrive className="size-4 text-sky-500" />
          <span>Kayıtlı konumlar ve dosya dağılımı</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            <Boxes className="size-3 mr-1" />
            {units.length} Konum grubu
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            <Layers className="size-3 mr-1" />
            {shelfCount} Raf / kutu
          </Badge>
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-mono text-xs"
          >
            <span className="size-1.5 rounded-full bg-emerald-500 mr-1" />
            {placedCount} Yerleşik Dosya
          </Badge>
        </div>
      </div>

      <p className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">Önce konum grubunu, ardından dosyayı seçin. Raf kartları kayıtlı dağılımı gösterir; ölçekli bina planı değildir. Taşıma formunu kaydetmek dosyanın sistemdeki fiziksel konumunu değiştirir.</p>
      {state.status === "success" && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{state.message}</p>}
      {/* DOLAP SEÇİMİ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {units.map((unit) => {
          const isSelected = selectedUnit?.id === unit.id;
          const percent =
            unit.capacity && unit.capacity > 0
              ? Math.round((unit.used / unit.capacity) * 100)
              : null;

          return (
            <button
              key={unit.id}
              type="button"
              onClick={() => {
                setDestination("");
                setSelectedUnitId(unit.id);
                setSelectedFolderId("");
              }}
              disabled={pending}
              aria-pressed={isSelected}
              className={`flex flex-col justify-between rounded-xl border-2 p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? "border-sky-600 bg-sky-500/10 shadow-md"
                  : "border-border bg-card hover:border-sky-400 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-sky-600 dark:text-sky-400">
                  {unit.code}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase ${
                    isSelected
                      ? "bg-sky-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isSelected ? "Seçili" : `${unit.shelves.length} raf`}
                </span>
              </div>

              <div className="mt-2">
                <h4 className="break-words text-sm font-semibold text-foreground">{unit.name}</h4>
                <p className="break-words text-xs leading-5 text-muted-foreground">{unit.path}</p>

                <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Doluluk: {percent === null ? "—" : `%${percent}`}</span>
                  <span>
                    {unit.used} / {unit.capacity ?? "—"}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      percent === null
                        ? "bg-muted-foreground/30"
                        : percent > 85
                          ? "bg-red-500"
                          : percent > 60
                            ? "bg-amber-500"
                            : "bg-sky-500"
                    }`}
                    style={{ width: `${Math.min(100, percent ?? 0)}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* SEÇİLİ DOLABIN RAF DİZİLİMİ */}
      {selectedUnit && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-sky-600 px-2.5 py-1 font-mono text-xs font-bold text-white">
                {selectedUnit.code}
              </span>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {selectedUnit.name} · Raf ve kutular
                </h3>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" aria-hidden />
                  {selectedUnit.path}
                </p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">
              {selectedUnit.shelves.length} raf / kutu · {selectedUnit.used} dosya
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selectedUnit.shelves.map((shelf) => {
              const hidden = shelf.folderCount - shelf.folders.length;

              return (
                <div
                  key={shelf.id}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3"
                >
                  <div className="flex items-center justify-between border-b border-border pb-1.5">
                    <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                      {shelf.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {shelf.folderCount} / {shelf.capacity ?? "—"} dosya
                    </span>
                  </div>

                  <div className="flex min-h-[140px] flex-col gap-2">
                    {shelf.folders.map((folder) => {
                      const isSelected = selectedFolderId === folder.id;

                      return (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => { setDestination(""); setSelectedFolderId(isSelected ? "" : folder.id); }}
                          disabled={pending}
                          aria-pressed={isSelected}
                          className={`rounded-lg border p-2 text-left text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            isSelected
                              ? "border-amber-500 bg-amber-500/10 shadow-xs"
                              : "border-border bg-card hover:border-amber-400"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-primary">
                              {folder.barcode}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {folder.documentCount} evrak
                            </span>
                          </div>
                          <p className="mt-0.5 break-words text-sm font-medium text-foreground">
                            {folder.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {folder.filePlanCode} · {folderStatusLabels[folder.status]}
                          </p>
                        </button>
                      );
                    })}

                    {hidden > 0 && (
                      <p className="rounded-lg border border-dashed border-border p-2 text-center text-xs text-muted-foreground">
                        +{hidden} dosya daha bu rafta (listede gösterilmiyor)
                      </p>
                    )}

                    {shelf.folderCount === 0 && (
                      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                        Bu konumda dosya yok
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* GERÇEK TAŞIMA: seçili dosya hedef rafa POST edilir */}
          {selectedFolder && (
            <form
              action={action}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs"
            >
              <input type="hidden" name="folderId" value={selectedFolder.id} />

              <div className="flex items-center gap-2">
                <QrCode className="size-4 text-amber-500" aria-hidden />
                <span>
                  Seçili dosya: <strong>{selectedFolder.barcode}</strong> ·{" "}
                  {selectedFolder.title}
                </span>
              </div>

              <div className="flex w-full flex-wrap items-end gap-3">
                <Link href={`/dosya-islemleri/${selectedFolder.id}`} className="text-sm text-primary underline">Dosya detayını aç</Link>
                {selectedFolder.status === "Available" ? <>
                  <label className="min-w-0 flex-1 text-sm font-medium">Hedef raf / kutu
                    <select name="destinationLocationId" required disabled={pending} value={destination} onChange={event => setDestination(event.target.value)} className="mt-1.5 block h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="">Hedef konumu seçin</option>
                      {selectedUnit.shelves.filter(shelf => shelf.id !== selectedFolder.locationId).map(shelf => <option key={shelf.id} value={shelf.id}>{shelf.code} · {shelf.name}</option>)}
                    </select>
                  </label>
                  <button type="submit" disabled={pending || !destination} className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">{pending ? "Kaydediliyor…" : "Konum değişikliğini kaydet"}</button>
                  {selectedUnit.shelves.filter(shelf => shelf.id !== selectedFolder.locationId).length === 0 && <p className="w-full text-xs text-muted-foreground">Bu grupta başka hedef konum yok. Diğer konumlara taşıma için dosya listesindeki taşıma işlemini kullanın.</p>}
                </> : <p className="text-sm text-muted-foreground">{folderStatusLabels[selectedFolder.status]} durumundaki dosya taşınamaz.</p>}
                <button type="button" disabled={pending} onClick={() => { setSelectedFolderId(""); setDestination(""); }} className="rounded-lg border border-border p-2" aria-label="Seçimi temizle"><X className="size-4" aria-hidden /></button>
              </div>

              {state.status === "error" && (
                <p role="alert" className="w-full text-destructive">
                  {state.message}
                </p>
              )}
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Dolap listesi yerleşim ağacından türetilir: raf/kutu düğümlerinin üst düğümü
 * bir dolaptır. Raf tanımlı değilse dosya taşınan konumun kendisi tek raflı bir
 * birim olarak gösterilir. Kapasite yalnızca tanımlıysa toplanır; eksikse "—"
 * gösterilir, varsayılan bir sayı uydurulmaz.
 */
function buildUnits(
  locations: LocationOccupancyItem[],
  folders: FolderListItem[],
): SimulatorUnit[] {
  if (locations.length === 0) {
    return [];
  }

  const byId = new Map(locations.map((location) => [location.id, location]));
  const foldersByLocation = new Map<string, FolderListItem[]>();

  for (const folder of folders) {
    const bucket = foldersByLocation.get(folder.locationId);
    if (bucket) {
      bucket.push(folder);
    } else {
      foldersByLocation.set(folder.locationId, [folder]);
    }
  }

  const shelfNodes = locations.filter((location) => shelfTypes.has(location.type));
  const groups = new Map<string, LocationOccupancyItem[]>();

  if (shelfNodes.length > 0) {
    for (const shelf of shelfNodes) {
      const parentId = shelf.parentId ?? shelf.id;
      const bucket = groups.get(parentId);
      if (bucket) {
        bucket.push(shelf);
      } else {
        groups.set(parentId, [shelf]);
      }
    }
  } else {
    // Raf tanımı yoksa dosya barındıran her konum kendi başına bir birimdir.
    for (const location of locations) {
      if (location.folderCount > 0 || foldersByLocation.has(location.id)) {
        groups.set(location.id, [location]);
      }
    }
  }

  const units: SimulatorUnit[] = [];

  for (const [unitId, shelves] of groups) {
    const unit = byId.get(unitId);
    if (!unit) continue;

    const sortedShelves = [...shelves].sort((a, b) => a.code.localeCompare(b.code, "tr"));
    const capacities = sortedShelves
      .map((shelf) => shelf.capacity)
      .filter((capacity): capacity is number => capacity !== null);

    units.push({
      id: unit.id,
      code: unit.code,
      name: unit.name || unit.code,
      path: ancestorPath(unit, byId),
      capacity:
        unit.capacity ??
        (capacities.length > 0
          ? capacities.reduce((sum, capacity) => sum + capacity, 0)
          : null),
      used: sortedShelves.reduce((sum, shelf) => sum + shelf.folderCount, 0),
      shelves: sortedShelves.map((shelf) => ({
        id: shelf.id,
        code: shelf.code,
        name: shelf.name || shelf.code,
        capacity: shelf.capacity,
        folderCount: shelf.folderCount,
        folders: foldersByLocation.get(shelf.id) ?? [],
      })),
    });
  }

  return units.sort((a, b) => b.used - a.used || a.code.localeCompare(b.code, "tr"));
}

function ancestorPath(
  location: LocationOccupancyItem,
  byId: Map<string, LocationOccupancyItem>,
): string {
  const names: string[] = [];
  let current = location.parentId ? byId.get(location.parentId) : undefined;

  const visited = new Set([location.id]);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    names.push(current.name || current.code);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return names.reverse().join(" › ") || "Kök konum";
}
