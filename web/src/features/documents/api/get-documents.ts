import { apiGet } from "@/lib/api/api-client";
import type {
  DocumentListItem,
  PagedResult,
} from "@/features/documents/model/document";

export async function getDocuments(
  page = 1,
  pageSize = 25,
): Promise<PagedResult<DocumentListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  return apiGet<PagedResult<DocumentListItem>>(
    `/documents?${params.toString()}`,
    { cache: "no-store" },
  );
}
