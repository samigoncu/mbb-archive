"use server";
import { revalidatePath } from "next/cache";
import { apiGet, apiPost, ApiError } from "@/lib/api/api-client";
import { getDocuments } from "@/features/documents/api/get-documents";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";
export async function findTaskDocuments(search: string) {
  try { return { items: (await getDocuments(1, 25, { search: search.trim() || undefined })).items }; }
  catch { return { items: [], error: "Belgeler yüklenemedi." }; }
}
export async function getTaskAssignees(documentId: string, permission?: string) {
  try { return { items: await apiGet<{subjectId:string;unitName:string}[]>(`/workflows/assignees?${new URLSearchParams({documentId,...(permission ? {permission} : {})})}`,{cache:"no-store"}) }; }
  catch { return { items: [], error: "Birim personeli yüklenemedi veya atama yetkiniz yok." }; }
}
export async function assignTaskAction(_: ActionState, data: FormData): Promise<ActionState> {
  const value = (key:string) => String(data.get(key) ?? "").trim();
  if (!value("subjectId")) return {status:"error",message:"Personel seçin."};
  try {
    if (value("instanceId")) await apiPost(`/workflows/instances/${encodeURIComponent(value("instanceId"))}/assign`,{workItemId:value("workItemId"),subjectId:value("subjectId"),expectedVersion:Number(value("version"))});
    else await apiPost("/workflows/assigned-tasks",{documentId:value("documentId"),title:value("title"),subjectId:value("subjectId"),slaMinutes:Number(value("slaMinutes"))});
    revalidatePath("/gorevlerim");
    return {status:"success",message:"Görev personele atandı."};
  } catch (error) { return {status:"error",message:error instanceof ApiError ? error.message : "Görev atanamadı."}; }
}
