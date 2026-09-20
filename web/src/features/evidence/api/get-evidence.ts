import { apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type {
  EvidenceCapabilities,
  EvidenceValidationListItem,
} from "@/features/evidence/model/evidence";

export async function getEvidenceValidations(
  page = 1,
  filter: { kind?: string; status?: string } = {},
  pageSize = 50,
): Promise<PagedResult<EvidenceValidationListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (filter.kind) params.set("kind", filter.kind);
  if (filter.status) params.set("status", filter.status);

  return apiGet<PagedResult<EvidenceValidationListItem>>(
    `/evidence/validations?${params}`,
    { cache: "no-store" },
  );
}

export async function getEvidenceCapabilities(): Promise<EvidenceCapabilities | null> {
  try {
    return await apiGet<EvidenceCapabilities>("/evidence/capabilities", {
      cache: "no-store",
    });
  } catch {
    return null;
  }
}
