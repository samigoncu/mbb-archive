"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiPost } from "@/lib/api/api-client";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

/**
 * Belge koleksiyona eklenir; kopyalanmaz ve fiziksel klasöründen taşınmaz.
 * Aynı belge ikinci kez eklenirse backend kopya oluşturmaz.
 */
export async function addDocumentToCollectionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const collectionId = String(formData.get("collectionId") ?? "").trim();
  const documentId = String(formData.get("documentId") ?? "").trim();

  if (!collectionId) {
    return { status: "error", message: "Koleksiyon seçilmelidir." };
  }

  if (!documentId) {
    return { status: "error", message: "Belge bulunamadı." };
  }

  try {
    await apiPost<{ documentId: string }, void>(
      `/collections/${collectionId}/documents`,
      { documentId },
    );
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError ? error.message : "Belge eklenemedi.",
    };
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/koleksiyonlar", "layout");

  return { status: "success", message: "Belge koleksiyona eklendi." };
}
