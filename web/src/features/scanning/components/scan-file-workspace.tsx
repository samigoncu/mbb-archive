"use client";
import { useState, useRef } from "react";
import { Maximize2, X, FileText, ImageIcon, RotateCw, Scissors, Trash2, Upload, ZoomIn, ZoomOut, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScannedPage } from "./scan-indexing-studio";
export function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 MB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}
const iconButton = "rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40";
export function ScanFileQueue({
  pages,
  selectedId,
  disabled,
  maxUploadBytes,
  onSelect,
  onRotate,
  onRemove,
  onSeparator,
  onDetectSeparators,
  onRename,
}: {
  pages: ScannedPage[];
  selectedId?: string;
  disabled: boolean;
  maxUploadBytes: number;
  onSelect: (index: number) => void;
  onRotate: (index: number) => void;
  onRemove: (index: number) => void;
  onSeparator: (index: number) => void;
  onDetectSeparators: () => void;
  onRename?: (index: number, newName: string) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCommitRename = (index: number) => {
    if (onRename && editingName.trim()) {
      onRename(index, editingName.trim());
    }
    setEditingIndex(null);
  };

  return <div className="p-3">
    {pages.length > 1 && <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground"><span>Önizlemek için dosyayı seçin.</span><button type="button" disabled={disabled} onClick={onDetectSeparators} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Scissors className="size-3.5" aria-hidden />Dosya adından ayraç bul</button></div>}
    {!pages.length ? <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-4 text-sm text-muted-foreground"><FileText className="size-5 shrink-0" aria-hidden />Eklediğiniz dosyalar burada listelenir.</div> : <ul aria-label="Aktarım dosyaları" className="flex gap-3 overflow-x-auto pb-1">
      {pages.map((page, index) => <li key={page.id} className={`w-48 shrink-0 overflow-hidden rounded-lg border ${page.id === selectedId ? "border-sky-500 bg-sky-50/60 dark:bg-sky-950/20" : "border-border bg-background"}`}>
        {editingIndex === index ? (
          <div className="p-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <span className="text-[11px] font-medium text-muted-foreground">Dosya Adı:</span>
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCommitRename(index);
                } else if (e.key === "Escape") {
                  setEditingIndex(null);
                }
              }}
              className="h-7 w-full rounded border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              autoFocus
            />
            <div className="flex justify-end gap-1">
              <button
                type="button"
                className="rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
                onClick={() => setEditingIndex(null)}
              >
                İptal
              </button>
              <button
                type="button"
                className="rounded bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                onClick={() => handleCommitRename(index)}
              >
                Kaydet
              </button>
            </div>
          </div>
        ) : (
          <button type="button" aria-label={`${page.file.name} önizle`} aria-pressed={page.id === selectedId} onClick={() => onSelect(index)} className="block w-full p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Dosya {index + 1}</span><span>{page.isSeparator ? "Ayraç" : `Grup ${page.documentGroup ?? 1}`}</span></span>
            <span className="my-1 flex h-8 items-center justify-center overflow-hidden rounded-md border border-border bg-card">{page.isPdf || page.isOffice ? <FileText className={`size-7 ${page.isPdf ? "text-red-600 dark:text-red-400" : "text-sky-600 dark:text-sky-400"}`} aria-hidden /> : <img src={page.previewUrl} alt="" className="h-full max-w-full object-contain" style={{ transform: `rotate(${page.rotation}deg)` }} />}</span>
            <span className="block truncate text-sm font-medium" title={page.file.name}>{page.file.name}</span><span className={`mt-1 block text-xs ${page.file.size > maxUploadBytes ? "font-medium text-destructive" : "text-muted-foreground"}`}>{formatFileSize(page.file.size)}{page.file.size > maxUploadBytes ? " · Sınırı aşıyor" : ""}</span>
          </button>
        )}
        <div className="flex items-center justify-end gap-0.5 border-t border-border/60 px-1 py-0.5">
          {onRename && (
            <button
              type="button"
              disabled={disabled}
              className={iconButton}
              onClick={(e) => {
                e.stopPropagation();
                setEditingIndex(index);
                setEditingName(page.file.name);
              }}
              aria-label={`${page.file.name} dosya adını düzenle`}
              title="Dosya adını düzenle"
            >
              <Pencil className="size-3.5" aria-hidden />
            </button>
          )}
          {!page.isPdf && !page.isOffice && <button type="button" disabled={disabled} className={iconButton} onClick={() => onRotate(index)} aria-label={`${page.file.name} dosyasını 90 derece döndür`} title="90° döndür"><RotateCw className="size-4" aria-hidden /></button>}
          <button type="button" disabled={disabled} className={iconButton} onClick={() => onSeparator(index)} aria-label={`${page.file.name}: ${page.isSeparator ? "ayracı kaldır" : "ayraç olarak işaretle"}`} aria-pressed={!!page.isSeparator} title={page.isSeparator ? "Ayracı kaldır" : "Ayraç olarak işaretle"}><Scissors className="size-4" aria-hidden /></button>
          <button type="button" disabled={disabled} className={`${iconButton} hover:text-destructive`} onClick={() => onRemove(index)} aria-label={`${page.file.name} dosyasını çıkar`} title="Dosyayı çıkar"><Trash2 className="size-4" aria-hidden /></button>
        </div>
      </li>)}
    </ul>}
  </div>;
}
export function ScanPreview({ page, zoom, setZoom, dragging, disabled, onDragChange, onDrop, onSelectFiles }: {
  page?: ScannedPage; zoom: number; setZoom: (update: (value: number) => number) => void; dragging: boolean; disabled: boolean;
  onDragChange: (value: boolean) => void; onDrop: (event: React.DragEvent<HTMLDivElement>) => void; onSelectFiles: () => void;
}) {
  const previewDialog = useRef<HTMLDialogElement>(null);
  return <section aria-label="Dosya önizlemesi" className="overflow-hidden rounded-xl border border-border bg-card shadow-flat">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3"><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">Önizleme</h2><p className="mt-1 truncate text-xs text-muted-foreground" title={page?.file.name}>{page?.file.name ?? "Dosyanızı yüklemeden önce kontrol edin."}</p></div>
      {page?.isPdf && <Button type="button" size="sm" variant="outline" onClick={() => previewDialog.current?.showModal()}><Maximize2 className="size-4" aria-hidden />Tam ekran</Button>}
      {page && !page.isPdf && !page.isOffice && <div className="flex items-center gap-1 rounded-md border border-border"><button type="button" className={iconButton} onClick={() => setZoom(value => Math.max(50, value - 10))} aria-label="Önizlemeyi küçült"><ZoomOut className="size-4" aria-hidden /></button><span className="w-12 text-center text-xs tabular-nums">%{zoom}</span><button type="button" className={iconButton} onClick={() => setZoom(value => Math.min(200, value + 10))} aria-label="Önizlemeyi büyüt"><ZoomIn className="size-4" aria-hidden /></button></div>}
    </div>
    <div onDragOver={event => { event.preventDefault(); if (!disabled) onDragChange(true); }} onDragLeave={() => onDragChange(false)} onDrop={onDrop} className={`relative flex min-h-[240px] items-center justify-center overflow-auto p-3 lg:h-[clamp(240px,calc(100dvh-430px),600px)] ${dragging ? "bg-sky-50 ring-2 ring-inset ring-sky-500 dark:bg-sky-950/30" : "bg-muted/50"}`}>
      {page?.isPdf ? <iframe src={page.previewUrl} title={page.file.name} className="h-[45vh] lg:h-full min-h-0 w-full rounded-md border border-border bg-white" /> : page?.isOffice ? <div className="max-w-sm space-y-3 p-6 text-center"><FileText className="mx-auto size-10 text-sky-700" aria-hidden /><p className="break-words text-sm font-medium">{page.file.name}</p><p className="text-sm leading-6 text-muted-foreground">Orijinal Office belgesi korunur. PDF önizlemesi yükleme ve işleme sonrasında hazırlanır.</p></div> : page ? <img src={page.previewUrl} alt={page.file.name} className="max-h-[40vh] lg:max-h-full max-w-full rounded bg-white object-contain shadow-md" style={{ transform: `scale(${zoom / 100}) rotate(${page.rotation}deg)` }} /> : <div className="m-2 flex w-full flex-col items-center rounded-xl border-2 border-dashed border-border bg-card px-5 py-6 text-center sm:m-5">
        <span className="mb-3 rounded-2xl bg-sky-50 p-4 dark:bg-sky-950/40"><Upload className="size-8 text-sky-700 dark:text-sky-300" aria-hidden /></span><h3 className="text-base font-semibold">Dosyalarınızı buraya sürükleyin</h3><p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">PDF, Office belgesi veya taranmış görsel ekleyerek başlayın.</p><Button type="button" variant="outline" className="mt-5" disabled={disabled} onClick={onSelectFiles}>Bilgisayardan dosya seç</Button><p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><ImageIcon className="size-3.5" aria-hidden />PDF dosyaları tüm sayfalarıyla aktarılır.</p>
      </div>}
    </div>
    {page?.isPdf && <dialog ref={previewDialog} aria-label="Tam ekran PDF önizlemesi" className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-background p-0 text-foreground backdrop:bg-black/70">
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2"><h2 className="min-w-0 truncate text-sm font-semibold" title={page.file.name}>{page.file.name}</h2><Button type="button" variant="outline" size="sm" onClick={() => previewDialog.current?.close()} autoFocus><X className="size-4" aria-hidden />Kapat</Button></div>
        <iframe src={page.previewUrl} title={`${page.file.name} — tam ekran`} className="min-h-0 w-full flex-1 border-0 bg-white" />
      </div>
    </dialog>}
  </section>;
}
