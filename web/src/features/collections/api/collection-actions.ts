"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiDelete, apiPost, apiPut } from "@/lib/api/api-client";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

export async function createCollectionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isShared = formData.get("isShared") === "on";

  if (!name) {
    return { status: "error", message: "Koleksiyon adı gereklidir." };
  }

  try {
    await apiPost<
      { name: string; description: string | null; isShared: boolean },
      { id: string }
    >("/collections", {
      name,
      description: description || null,
      isShared,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError
          ? error.message
          : "Koleksiyon oluşturulamadı.",
    };
  }

  revalidatePath("/koleksiyonlar", "layout");
  revalidatePath("/documents", "layout");

  return { status: "success", message: "Koleksiyon oluşturuldu." };
}

/**
 * Koleksiyonu silmek içindeki belgeleri silmez; yalnızca sanal gruplamayı
 * kaldırır.
 */
export async function deleteCollectionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("collectionId") ?? "").trim();

  if (!id) {
    return { status: "error", message: "Koleksiyon bulunamadı." };
  }

  try {
    await apiDelete(`/collections/${id}`);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError ? error.message : "Koleksiyon silinemedi.",
    };
  }

  revalidatePath("/koleksiyonlar", "layout");
  revalidatePath("/documents", "layout");

  return { status: "success", message: "Koleksiyon kaldırıldı." };
}

export async function removeDocumentFromCollectionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const collectionId = String(formData.get("collectionId") ?? "").trim();
  const documentId = String(formData.get("documentId") ?? "").trim();

  if (!collectionId || !documentId) {
    return { status: "error", message: "Kayıt bulunamadı." };
  }

  try {
    await apiDelete(`/collections/${collectionId}/documents/${documentId}`);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError ? error.message : "Belge çıkarılamadı.",
    };
  }

  revalidatePath("/koleksiyonlar", "layout");
  revalidatePath("/documents", "layout");

  return { status: "success", message: "Belge koleksiyondan çıkarıldı." };
}

export async function updateCollectionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("collectionId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name)
    return { status: "error", message: "Koleksiyon ve ad gereklidir." };
  try {
    await apiPut(`/collections/${encodeURIComponent(id)}`, {
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      isShared: formData.get("isShared") === "on",
    });
    revalidatePath("/koleksiyonlar", "layout");
    revalidatePath("/documents", "layout");
    return {
      status: "success",
      message: "Koleksiyon ve paylaşım durumu güncellendi.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError
          ? error.message
          : "Koleksiyon güncellenemedi.",
    };
  }
}
