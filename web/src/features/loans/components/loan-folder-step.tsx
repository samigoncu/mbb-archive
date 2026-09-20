"use client";

import { Check, FolderArchive, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import { cn } from "@/lib/utils";

export function LoanFolderStep({
  folder,
  folders,
  totalFolders,
  folderPage,
  folderQuery,
  pending,
  onFolderQueryChange,
  onSearch,
  onSelectFolder,
  onClearFolder,
  onPageChange,
}: {
  folder: FolderListItem | null;
  folders: FolderListItem[];
  totalFolders: number;
  folderPage: number;
  folderQuery: string;
  pending: boolean;
  onFolderQueryChange: (query: string) => void;
  onSearch: (page: number) => void;
  onSelectFolder: (item: FolderListItem) => void;
  onClearFolder: () => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <fieldset disabled={pending} className="flex flex-1 flex-col min-h-0 space-y-3">
      <legend className="sr-only">1. Fiziksel dosya seçimi</legend>

      <form
        className="flex items-end gap-2 shrink-0"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(1);
        }}
      >
        <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
          Dosya başlığı
          <div className="relative mt-1">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={folderQuery}
              maxLength={100}
              onChange={(event) => onFolderQueryChange(event.target.value)}
              placeholder="Dosya adı veya barkod ile filtrele..."
              className="h-9.5 pl-9 rounded-xl text-xs bg-muted/20 border-border/70 focus-visible:ring-primary/20"
            />
            {folderQuery && (
              <button
                type="button"
                onClick={() => {
                  onFolderQueryChange("");
                  onSearch(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        </label>
        <button
          type="submit"
          className="h-9.5 rounded-xl border border-border/80 bg-secondary px-4 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 shadow-xs transition-colors disabled:opacity-50"
        >
          Dosya ara
        </button>
      </form>

      {folder && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2 text-xs shrink-0 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
              <Check className="size-3" aria-hidden />
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Seçilen Dosya:</span>
            <span className="font-mono font-bold text-foreground">{folder.barcode}</span>
            <span className="text-muted-foreground truncate hidden sm:inline">· {folder.title}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearFolder}
            className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
          >
            <X className="size-3 mr-1" aria-hidden />
            Seçimi Kaldır
          </Button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {folders.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Seçilebilir dosyalar">
            {folders.map((item) => {
              const isSelected = folder?.id === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelectFolder(item)}
                    aria-pressed={isSelected}
                    aria-label={`${item.barcode} · ${item.title}`}
                    className={cn(
                      "group relative flex w-full items-start justify-between gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/[0.05] ring-1.5 ring-primary shadow-xs"
                        : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/25 hover:shadow-xs",
                    )}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors mt-0.5",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                        )}
                      >
                        <FolderArchive className="size-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {item.barcode}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 border-muted-foreground/30 text-muted-foreground"
                          >
                            SDP {item.filePlanCode}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-foreground/90 line-clamp-1">
                          {item.title}
                        </p>
                        {item.locationName && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                            {item.locationName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 pl-1 pt-0.5">
                      {isSelected ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                          <Check className="size-3" aria-hidden />
                        </span>
                      ) : (
                        <span className="size-4 rounded-full border border-border group-hover:border-primary/50 block transition-colors" />
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex h-full min-h-[140px] items-center justify-center">
            <p className="text-center text-xs text-muted-foreground">Uygun dosya bulunamadı.</p>
          </div>
        )}
      </div>

      <nav
        aria-label="Dosya seçim sayfaları"
        className="mt-auto flex items-center justify-between gap-3 border-t border-border/50 pt-2 shrink-0"
      >
        <button
          type="button"
          className="h-8 rounded-lg border border-border/80 px-3 text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
          disabled={folderPage <= 1}
          onClick={() => onPageChange(folderPage - 1)}
        >
          Önceki
        </button>
        <span className="text-xs text-muted-foreground font-medium">
          {totalFolders} dosya · Sayfa {folderPage}
        </span>
        <button
          type="button"
          className="h-8 rounded-lg border border-border/80 px-3 text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
          disabled={folderPage * 25 >= totalFolders}
          onClick={() => onPageChange(folderPage + 1)}
        >
          Sonraki
        </button>
      </nav>
    </fieldset>
  );
}

