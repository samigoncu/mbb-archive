"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiPost } from "@/lib/api/api-client";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

/**
 * Doğrulama backend domain kurallarının alternatifi değildir; burada yalnızca
 * boş gönderim engellenir, iş kuralı hatası API'den ProblemDetails ile döner.
 */
export async function createFolderAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const barcode = String(formData.get("barcode") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const filePlanCode = String(formData.get("filePlanCode") ?? "").trim();
  const locationId = String(formData.get("locationId") ?? "").trim();

  if (!barcode || !title || !filePlanCode || !locationId) {
    return { status: "error", message: "Barkod, başlık, dosya planı ve konum zorunludur." };
  }

  try {
    await apiPost<Record<string, string>, { id: string }>(
      "/physical-archive/folders",
      { barcode, title, filePlanCode, locationId },
    );
  } catch (error) {
    return { status: "error", message: toMessage(error) };
  }

  revalidatePath("/dosya-islemleri");

  return { status: "success", message: `${barcode} numaralı dosya oluşturuldu.` };
}

export async function moveFolderAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const folderId = String(formData.get("folderId") ?? "").trim();
  const destinationLocationId = String(formData.get("destinationLocationId") ?? "").trim();

  if (!folderId || !destinationLocationId) {
    return { status: "error", message: "Hedef konum seçilmelidir." };
  }

  try {
    await apiPost<Record<string, string>, void>(
      `/physical-archive/folders/${folderId}/move`,
      { destinationLocationId },
    );
  } catch (error) {
    return { status: "error", message: toMessage(error) };
  }

  revalidatePath("/dosya-islemleri");

  return { status: "success", message: "Dosya yeni konuma taşındı." };
}

function toMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : "İşlem tamamlanamadı.";
}
