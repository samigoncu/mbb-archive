"use server";
import { revalidatePath } from "next/cache";
import { getDossier } from "./dossiers";
import { uploadScannedDocumentAction } from "@/features/scanning/api/upload-actions";
import { maxUploadBytes } from "@/features/scanning/model/upload-size";
import { authorizationHeader, getServerApiBaseUrl } from "@/lib/api/api-client";
export type ImportResult = { name: string; success: boolean; message: string; documentId?: string };
export async function importDossierFile(id: string, data: FormData): Promise<ImportResult[]> {
  const file = data.get("file");
  if (!file || typeof file === "string" || !file.size || file.size > maxUploadBytes)
    return [{ name: "Dosya", success: false, message: "Boş olmayan, en fazla 200 MB boyutunda bir dosya seçin." }];
  try {
    const dossier = await getDossier(id);
    if (file.name.toLowerCase().endsWith(".zip")) {
      const response = await fetch(`${getServerApiBaseUrl()}/documents/dossiers/${encodeURIComponent(id)}/zip`, {
        method: "POST", headers: { ...(await authorizationHeader()), "Content-Type": "application/zip" }, body: await file.arrayBuffer(),
      });
      if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.detail ?? "ZIP aktarılamadı."); }
      const results = await response.json() as ImportResult[];
      revalidatePath("/islem-takibi");
      revalidatePath("/documents", "layout"); return results;
    }
    const form = new FormData();
    form.set("files", file); form.set("title", file.name); form.set("ownerUnitId", dossier.ownerUnitId);
    form.set("dossierId", dossier.id); form.set("filePlanId", dossier.filePlanId); form.set("filePlanItemId", dossier.filePlanItemId);
    const result = await uploadScannedDocumentAction(form);
    revalidatePath("/islem-takibi");
    revalidatePath("/documents", "layout");
    return [{ name: file.name, success: result.success, message: [result.message, ...(result.warnings ?? [])].join(" "), documentId: result.documentId }];
  } catch (error) { return [{ name: file.name, success: false, message: error instanceof Error ? error.message : "Aktarım tamamlanamadı." }]; }
}
