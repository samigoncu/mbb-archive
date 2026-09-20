import Link from "next/link";
import { Folder, FolderOpen, FolderTree } from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import { getFolders } from "../api/get-folders";
import { cn } from "@/lib/utils";
import { ExplorerPagination } from "@/features/documents/components/explorer-pagination";

export async function FolderExplorer({ selectedId, page = 1, query = "", basePath = "/documents" }: {
  selectedId?: string;
  page?: number;
  query?: string;
  basePath?: string;
}) {
  const result = await getFolders(page, 25, { title: query }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 403) return null;
    throw error;
  });
  if (!result) return <p className="p-3 text-sm text-muted-foreground">Klasörleri görüntüleme yetkiniz yok.</p>;
  const groups = Map.groupBy(result.items, (folder) => folder.filePlanCode);
  function pageHref(next: number) {
    const params = new URLSearchParams({ folderPage: String(next) });
    if (query) params.set("folderSearch", query);
    return `${basePath}?${params}`;
  }
  return (
    <nav aria-label="Arşiv gezgini" className="rounded-lg border border-border bg-card p-3">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><FolderTree className="size-4" aria-hidden />Arşiv gezgini</h2>
      <Link href="/documents" className="mb-3 block rounded px-2 py-2 text-sm text-primary hover:bg-muted">Tüm belgeler</Link>
      <form action={basePath} className="mb-3 flex gap-1">
        <input aria-label="Klasör adına göre ara" name="folderSearch" defaultValue={query} placeholder="Klasör ara…" className="h-8 min-w-0 flex-1 rounded border border-border bg-background px-2 text-xs" />
        <button type="submit" className="rounded border border-border px-2 text-xs hover:bg-muted">Ara</button>
      </form>
      <p className="mb-2 text-xs text-muted-foreground">{result.totalCount} klasör · dosya planı koduna göre</p>
      {result.items.length === 0 ? <p className="py-3 text-xs text-muted-foreground">Klasör bulunamadı.</p> : null}
      <div className="max-h-[50vh] overflow-y-auto">
      {[...groups].sort(([a], [b]) => a.localeCompare(b, "tr")).map(([code, folders]) => (
        <details key={code} open className="mb-1">
          <summary className="cursor-pointer rounded px-2 py-2 text-xs font-semibold hover:bg-muted">{code || "Dosya planı belirtilmemiş"}</summary>
          <ul className="ml-3 border-l border-border pl-2">
            {folders.map((folder) => {
              const active = folder.id === selectedId;
              const Icon = active ? FolderOpen : Folder;
              const params = new URLSearchParams({ folderPage: String(page) });
              if (query) params.set("folderSearch", query);
              return <li key={folder.id}>
                <Link href={`/dosya-islemleri/${folder.id}?${params}`} aria-current={active ? "page" : undefined} className={cn("flex items-start gap-2 rounded p-2 text-xs hover:bg-muted", active && "bg-accent")}>
                  <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0"><span className="block break-words font-medium">{folder.title}</span><span className="text-muted-foreground">{folder.barcode} · {folder.documentCount} belge</span></span>
                </Link>
              </li>;
            })}
          </ul>
        </details>
      ))}
      </div>
      <ExplorerPagination page={page} totalPages={Math.ceil(result.totalCount / 25)} href={pageHref} label="Klasör sayfaları" />
    </nav>
  );
}
