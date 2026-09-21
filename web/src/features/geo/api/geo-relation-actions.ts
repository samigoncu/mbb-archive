"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiDelete, apiPost } from "@/lib/api/api-client";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

/**
 * Belgeyi haritadaki kurumsal nesneyle ilişkilendirir (§9). Aynı belge-nesne-tür
 * üçlüsü ikinci kez gönderildiğinde backend kopya oluşturmaz.
 */
export async function createGeoRelationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const geoEntityId = String(formData.get("geoEntityId") ?? "").trim();
  const relationType = String(formData.get("relationType") ?? "").trim();

  if (!documentId || !geoEntityId) {
    return { status: "error", message: "Coğrafi nesne seçilmelidir." };
  }

  if (!relationType) {
    return { status: "error", message: "İlişki türü seçilmelidir." };
  }

  try {
    await apiPost<
      { geoEntityId: string; relationType: string; validFrom: null; validTo: null },
      { id: string }
    >(`/geo/documents/${documentId}/relations`, {
      geoEntityId,
      relationType,
      validFrom: null,
      validTo: null,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError ? error.message : "İlişki kurulamadı.",
    };
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/harita");

  return { status: "success", message: "Harita ilişkisi kuruldu." };
}

/**
 * İlişkiyi kapatır. Kayıt silinmez; hangi kararın hangi dönemde hangi nesneyi
 * etkilediği geçmişte kalır.
 */
export async function closeGeoRelationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const relationId = String(formData.get("relationId") ?? "").trim();

  if (!documentId || !relationId) {
    return { status: "error", message: "İlişki bulunamadı." };
  }

  try {
    await apiDelete(`/geo/documents/${documentId}/relations/${relationId}`);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError ? error.message : "İlişki kapatılamadı.",
    };
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/harita");

  return { status: "success", message: "İlişki kapatıldı." };
}

export async function searchGeoEntitiesAction(search: string) {
  const { getGeoEntities } = await import("@/features/geo/api/get-geo");
  const result = await getGeoEntities({ search });
  return result.items;
}

export async function getGeoEntityDetailsAction(id: string) {
  const { getGeoEntity } = await import("@/features/geo/api/get-geo");
  return await getGeoEntity(id);
}
