import { apiGet } from "@/lib/api/api-client";
import type {
  SearchCriteria,
  SearchResponse,
} from "@/features/search/model/search";

export const searchPageSize = 10;

export async function searchDocuments(
  criteria: SearchCriteria,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: criteria.q,
    page: String(criteria.page),
    pageSize: String(searchPageSize),
  });

  if (criteria.mimeType) {
    params.set("mimeType", criteria.mimeType);
  }

  if (criteria.filePlanCode) {
    params.set("filePlanCode", criteria.filePlanCode);
  }

  return apiGet<SearchResponse>(`/search/documents?${params.toString()}`, {
    cache: "no-store",
  });
}
