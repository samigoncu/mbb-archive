import { apiGet } from "@/lib/api/api-client";
import type {
  DocumentListCriteria,
  DocumentListItem,
  PagedResult,
} from "@/features/documents/model/document";

export const documentsPageSize = 25;

/**
 * Süzgeç ve sıralama sunucu tarafında uygulanır; istemcide sayfa içi filtreleme
 * yapılmaz, aksi halde toplam sayı ile liste tutarsız olur.
 */
export async function getDocuments(
  page = 1,
  pageSize = documentsPageSize,
  criteria: Omit<DocumentListCriteria, "page"> = {},
): Promise<PagedResult<DocumentListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  for (const key of ["ownerUnitId", "filePlanCode", "dossierId", "unfiled"] as const) {
    if (criteria[key]) params.set(key, criteria[key]);
  }
  if (criteria.search) params.set("search", criteria.search);
  if (criteria.status) params.set("status", criteria.status);
  if (criteria.createdFrom)
    params.set("createdFrom", `${criteria.createdFrom}T00:00:00Z`);
  if (criteria.createdTo)
    params.set("createdTo", `${criteria.createdTo}T23:59:59Z`);
  if (criteria.sort) params.set("sort", criteria.sort);

  return await apiGet<PagedResult<DocumentListItem>>(
    `/documents?${params.toString()}`,
    { cache: "no-store" },
  );
}
