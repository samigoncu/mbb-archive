import { apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type { ArchiveUnit, DigitalDossier } from "../model/dossier";
export function getArchiveUnits() { return apiGet<ArchiveUnit[]>("/access/archive-units", { cache: "no-store" }); }
export function getDossiers(params: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  return apiGet<PagedResult<DigitalDossier>>(`/documents/dossiers?${query}`, { cache: "no-store" });
}
export function getDossier(id: string) { return apiGet<DigitalDossier>(`/documents/dossiers/${encodeURIComponent(id)}`, { cache: "no-store" }); }
