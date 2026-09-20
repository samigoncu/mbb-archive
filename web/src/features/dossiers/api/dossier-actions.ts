"use server";
import { revalidatePath } from "next/cache";
import { apiPost, apiPut, ApiError } from "@/lib/api/api-client";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";
export async function createDossierAction(_: ActionState, data: FormData): Promise<ActionState> {
  const [filePlanId, filePlanItemId] = String(data.get("planItem") ?? "").split("|");
  try {
    await apiPost("/documents/dossiers", { ownerUnitId: String(data.get("ownerUnitId") || "") || null,
      filePlanId, filePlanItemId, title: String(data.get("title") ?? ""), year: Number(data.get("year")) });
    revalidatePath("/documents");
    return { status: "success", message: "Dijital dosya oluşturuldu." };
  } catch (e) { return { status: "error", message: e instanceof ApiError ? e.message : "Dosya oluşturulamadı." }; }
}
export async function fileDocumentAction(_: ActionState, data: FormData): Promise<ActionState> {
  try {
    await apiPost(`/documents/dossiers/${encodeURIComponent(String(data.get("dossierId")))}/documents`, { documentId: String(data.get("documentId")) });
    revalidatePath("/documents");
    return { status: "success", message: "Belge dijital dosyaya yerleştirildi." };
  } catch (e) { return { status: "error", message: e instanceof ApiError ? e.message : "Belge yerleştirilemedi." }; }
}
export async function assignPhysicalOwnerAction(_: ActionState, data: FormData): Promise<ActionState> {
  try {
    await apiPost(`/physical-archive/folders/${encodeURIComponent(String(data.get("folderId")))}/owner`, { ownerUnitId: String(data.get("ownerUnitId")) });
    revalidatePath("/dosya-islemleri");
    return { status: "success", message: "Dosyanın sahip birimi atandı." };
  } catch (e) { return { status: "error", message: e instanceof ApiError ? e.message : "Birim atanamadı." }; }
}

export async function renameDossierAction(_: ActionState, data: FormData): Promise<ActionState> {
  try {
    await apiPut(`/documents/dossiers/${encodeURIComponent(String(data.get("dossierId")))}`, {title:String(data.get("title") ?? ""),expectedTitle:String(data.get("expectedTitle") ?? "")});
    revalidatePath("/documents", "layout");return {status:"success",message:"Klasör adı güncellendi."};
  } catch(e) { return {status:"error",message:e instanceof ApiError ? e.message : "Klasör adı güncellenemedi."}; }
}
