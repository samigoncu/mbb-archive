"use server";
import { revalidatePath } from "next/cache";
import { apiPost, apiPut, apiDelete, ApiError } from "@/lib/api/api-client";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";
export type UnitPlanActionState = ActionState & { revision?: number };
function refresh() {
  for (const path of ["/tanimlamalar/birimler", "/tanimlamalar/yetkiler", "/documents", "/dosya-islemleri", "/tarama"]) revalidatePath(path);
}
export async function saveUnitPlans(_: UnitPlanActionState, data: FormData): Promise<UnitPlanActionState> {
  try {
    const items = data.getAll("planItem").map(value => {
      const [planId, itemId] = String(value).split("|"); return { planId, itemId };
    });
    const result = await apiPut<{ revision: number; items: typeof items }, { revision: number }>(
      `/organization/units/${encodeURIComponent(String(data.get("unitId")))}/file-plans`, { revision: Number(data.get("revision")), items });
    refresh();
    return { status: "success", message: "SDP eşleştirmesi kaydedildi. Üç arşiv ekranında da kullanılabilir.", revision: result.revision };
  } catch (error) { return { status: "error", message: error instanceof ApiError ? error.message : "Eşleştirme kaydedilemedi." }; }
}
export async function unitAction(_: ActionState, data: FormData): Promise<ActionState> {
  const value = (key: string) => String(data.get(key) ?? "").trim();
  const id = encodeURIComponent(value("unitId"));
  try {
    switch (value("operation")) {
      case "delete":
        if (value("confirm") !== "on") return { status: "error", message: "Birim silme seçimini onaylayın." };
        await apiDelete(`/organization/units/${id}`); break;
      case "rename": await apiPut(`/organization/units/${id}`, { name: value("name"), shortName: value("shortName") || null }); break;
      case "move": await apiPost(`/organization/units/${id}/move`, { newParentId: value("parentId") || null }); break;
      case "active": await apiPost(`/organization/units/${id}/active`, { isActive: value("isActive") === "true" }); break;
      case "member-add": await apiPost("/organization/memberships", { unitId: value("unitId"), subjectId: value("subjectId"), isPrimary: value("isPrimary") === "on" }); break;
      case "member-remove": await apiDelete(`/organization/subjects/${encodeURIComponent(value("subjectId"))}/memberships/${id}`); break;
      default: return { status: "error", message: "Bilinmeyen birim işlemi." };
    }
    refresh();
    return { status: "success", message: value("operation") === "delete" ? "Birim kaldırıldı." : "Birim bilgileri kaydedildi." };
  } catch (error) { return { status: "error", message: error instanceof ApiError ? error.message : "Birim işlemi tamamlanamadı." }; }
}
