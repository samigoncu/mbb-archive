import { apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type { Disposition, LegalHold } from "../model/disposition";
import type { RetentionCaseListItem } from "../model/retention";

export const getDispositions = (page = 1, status = "") => apiGet<PagedResult<Disposition>>(
  `/retention/dispositions/?${new URLSearchParams({ page: String(page), pageSize: "25", status })}`, { cache: "no-store" });
export const getDisposition = (id: string) => apiGet<Disposition>(`/retention/dispositions/${encodeURIComponent(id)}`, { cache: "no-store" });
export const getRetentionCase = (id: string) => apiGet<RetentionCaseListItem>(`/retention/cases/${encodeURIComponent(id)}`, { cache: "no-store" });
export const getLegalHolds = (id: string) => apiGet<LegalHold[]>(`/retention/cases/${encodeURIComponent(id)}/legal-holds`, { cache: "no-store" });
