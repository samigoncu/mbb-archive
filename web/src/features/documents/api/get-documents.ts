import { apiGet } from "@/lib/api/api-client";
import type {
  DocumentListItem,
  PagedResult,
} from "@/features/documents/model/document";

export async function getDocuments(
  page = 1,
  pageSize = 25,
): Promise<PagedResult<DocumentListItem>> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    return await apiGet<PagedResult<DocumentListItem>>(
      `/documents?${params.toString()}`,
      { cache: "no-store" },
    );
  } catch {
    return {
      items: [],
      totalCount: 0,
      page,
      pageSize,
    };
  }
}
