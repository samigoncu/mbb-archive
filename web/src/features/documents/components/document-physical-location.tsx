"use client";
import { useEffect, useState, useTransition } from "react";
import { MoveFolderDialog } from "@/features/physical-archive/components/folder-dialogs";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import { folderStatusLabels } from "@/features/physical-archive/model/folder";
import type { LocationListItem } from "@/features/physical-archive/model/location";
import { loadPhysicalLocationsAction } from "../api/physical-location-action";
import { DocumentFilingEditor } from "./document-filing-editor";

export function DocumentPhysicalLocation({ documentId, folders, cancelled, inline = false }: {
  documentId: string; folders: FolderListItem[]; cancelled: boolean; inline?: boolean;
}) {
  const [open, setOpen] = useState(inline);
  const [locations, setLocations] = useState<LocationListItem[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function load() {
    setError("");
    startTransition(async () => {
      const result = await loadPhysicalLocationsAction();
      if (result.error) { setLocations([]); setError(result.error); }
      else setLocations(result.locations ?? []);
    });
  }
  useEffect(() => { if (inline && !cancelled) load(); }, [documentId, inline, cancelled]);
  return <section className="rounded-lg border border-border bg-card p-4 text-sm">
    <h3 className="font-semibold">Fiziksel konum</h3>
    <p className="my-2 text-xs text-muted-foreground">{folders.map(f => `${f.barcode} · ${f.locationName || f.locationCode}`).join("; ") || "Fiziksel klasör bağlantısı yok."}</p>
    {!inline && <button type="button" aria-expanded={open} disabled={cancelled || pending} className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
      onClick={() => { setOpen(!open); if (!open) load(); }}>Fiziksel yerini değiştir</button>}
    {cancelled && <p className="mt-2 text-xs text-muted-foreground">Konumu değiştirmek için önce belge iptalini geri alın.</p>}
    {open && !cancelled && <div className="mt-3 space-y-3">
      <p>Belgenin başka bir klasörde tutulması gerekiyorsa fiziksel klasör bağlantısını değiştirin.</p>
      <DocumentFilingEditor documentId={documentId} triggerLabel="Fiziksel klasör bağlantısını değiştir" physicalOnly inline={inline} />
      {!!folders.length && <div className="space-y-2 border-t pt-3">
        <h4 className="font-semibold">Bağlı klasörün rafını değiştir</h4>
        <p className="text-xs text-muted-foreground">Klasörün yeni raf veya kutu bilgisi kaydedilir. Bu değişiklik klasördeki tüm belgelerin fiziksel konumunu etkiler.</p>
        {pending && <p role="status">Konumlar yükleniyor…</p>}
        {error && <p role="alert" className="text-destructive">{error} <button type="button" onClick={load} className="underline">Yeniden dene</button></p>}
        {!pending && !error && !locations.some(l => l.isActive && (l.type === "Shelf" || l.type === "Box")) && <p>Taşınabilecek aktif raf veya kutu tanımlı değil.</p>}
        {folders.map(folder => <div key={folder.id} className="rounded border p-2">
          <p className="font-semibold">{folder.barcode} · {folder.title}</p>
          <p className="mb-2 text-xs">{folder.locationName || folder.locationCode} · {folder.documentCount} belge</p>
          {folder.status !== "Available" ? <p className="text-xs">{folderStatusLabels[folder.status]} durumundaki klasör taşınamaz.</p>
            : !!locations.length && !pending && !error && <MoveFolderDialog key={`${folder.id}:${folder.locationId}`} folderId={folder.id} folderBarcode={folder.barcode} currentLocationId={folder.locationId} locations={locations.filter(l => l.isActive)} triggerLabel="Raf / kutu değiştir" />}
        </div>)}
      </div>}
    </div>}
  </section>;
}
