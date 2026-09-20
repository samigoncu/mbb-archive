import { apiGet } from "@/lib/api/api-client";
import type { UnitPlanAssignment, UnitPlanDetails } from "../model/unit-plans";
export function getUnitPlanAssignments(unitId?: string) {
  const params = new URLSearchParams();
  if (unitId) params.set("unitId", unitId);
  return apiGet<UnitPlanAssignment[]>(`/organization/file-plan-assignments?${params}`, { cache: "no-store" });
}
export function getUnitPlanDetails(id: string) {
  return apiGet<UnitPlanDetails>(`/organization/units/${encodeURIComponent(id)}/file-plans`, { cache: "no-store" });
}
