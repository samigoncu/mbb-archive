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
    pageSize: String(criteria.pageSize ?? searchPageSize),
  });

  if (criteria.sort) params.set("sort", criteria.sort);
  if (criteria.to) params.set("to", criteria.to);

  if (criteria.mimeType) {
    params.set("mimeType", criteria.mimeType);
  }

  if (criteria.filePlanCode) {
    params.set("filePlanCode", criteria.filePlanCode);
  }
  if (criteria.conditions?.length) {
    params.set("conditions", JSON.stringify(criteria.conditions));
  }
  if (criteria.from) params.set("from", criteria.from);
  if ((criteria.from || criteria.to) && criteria.dateField) {
    params.set("dateField", criteria.dateField);
  }

  // Üstveri araması yalnız anahtar ve değer birlikte verildiğinde uygulanır.
  if (criteria.metadataKey && criteria.metadataValue) {
    params.set("metadataKey", criteria.metadataKey);
    params.set("metadataValue", criteria.metadataValue);
  }

  return apiGet<SearchResponse>(`/search/documents?${params.toString()}`, {
    cache: "no-store",
  });
}
