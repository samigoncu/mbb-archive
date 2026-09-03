import { apiGet, getPublicApiBaseUrl } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type { FolderListItem } from "@/features/physical-archive/model/folder";

export type AuditEntry = {
  sequence: number;
  messageId: string;
  eventName: string;
  documentId: string | null;
  occurredAt: string;
  receivedAt: string;
  previousHash: string;
  entryHash: string;
};

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
export function documentContentUrl(documentId: string, download = false): string {
  const suffix = download ? "?download=true" : "";
  return `${getPublicApiBaseUrl()}/documents/${documentId}/content${suffix}`;
}
