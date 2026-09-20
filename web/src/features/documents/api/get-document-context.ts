import { apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type { FolderListItem } from "@/features/physical-archive/model/folder";

export type AuditEntry = import("@/features/audit/model/audit").AuditEvent;

/** Belgenin denetim izi; append-only hash zincirinden okunur. */
export async function getDocumentAuditTrail(
  documentId: string,
  take = 25,
): Promise<AuditEntry[]> {
  const params = new URLSearchParams({ documentId, take: String(take) });

  return apiGet<AuditEntry[]>(`/audit/events?${params.toString()}`, {
    cache: "no-store",
  });
}

/** Belgeyi içeren fiziksel klasör(ler). Bir belge birden fazla klasöre bağlanabilir. */
export async function getDocumentFolders(
  documentId: string,
): Promise<FolderListItem[]> {
  const params = new URLSearchParams({ containsDocumentId: documentId, pageSize: "10" });

  const result = await apiGet<PagedResult<FolderListItem>>(
    `/physical-archive/folders?${params.toString()}`,
    { cache: "no-store" },
  );

  return result.items;
}

/** Tarayıcının doğrudan yükleyeceği içerik adresi (iframe/indirme). */
export function documentContentUrl(documentId: string, download = false, version?: number): string {
  const query = new URLSearchParams();
  if (download) query.set("download", "true");
  if (version !== undefined) query.set("version", String(version));
  const suffix = query.size ? `?${query}` : "";
  // Uygulama içi uç: iframe ve indirme bağlantısı Authorization başlığı
  // taşıyamaz, jeton sunucudaki yönlendirici uçta eklenir.
  return `/api/documents/${encodeURIComponent(documentId)}/content${suffix}`;
}
