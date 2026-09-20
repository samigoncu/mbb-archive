"use server";
import { revalidatePath } from "next/cache";
import { apiPost, ApiError } from "@/lib/api/api-client";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";
export async function directoryAction(_: ActionState, data: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user?.isAuthenticated || (!user.isBootstrapAdministrator && !user.permissions.includes("organization.manage")))
    return { status: "error", message: "Dizin eşitleme yetkiniz yok." };
  const operation = String(data.get("operation"));
  if (data.get("confirm") !== "on") return { status: "error", message: "Üyelik değişikliklerini onaylayın." };
  if (!["sync-units", "sync-user"].includes(operation)) return { status: "error", message: "Bilinmeyen dizin işlemi." };
  try {
    const result = await apiPost<unknown, { unitsCreated: number; unitsLinked: number; membershipsAssigned: number; membershipsRemoved: number; warnings: string[] }>(`/organization/directory/${operation}`,
      operation === "sync-user" ? { subjectId: String(data.get("subjectId") ?? "").trim(), directoryUserName: String(data.get("directoryUserName") ?? "").trim() } : {});
    revalidatePath("/tanimlamalar/birimler"); revalidatePath("/tanimlamalar/yetkiler");
    return { status: "success", message: `${result.unitsCreated} birim eklendi, ${result.unitsLinked} birim bağlandı; ${result.membershipsAssigned} üyelik eklendi, ${result.membershipsRemoved} eski dizin üyeliği kaldırıldı. ${result.warnings.join(" ")}` };
  } catch (error) {
    revalidatePath("/tanimlamalar/birimler");
    return { status: "error", message: error instanceof ApiError ? error.message : "Dizin eşitlemesi tamamlanamadı." };
  }
}
