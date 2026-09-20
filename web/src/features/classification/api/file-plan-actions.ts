"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiPost, apiPut } from "@/lib/api/api-client";

export type FilePlanActionResult = { ok?: true; error?: string };

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/** Dosya planı hem bu ekranda hem dosyalama seçicilerinde okunur. */
function refresh() {
  revalidatePath("/tanimlamalar");
  revalidatePath("/documents");
  revalidatePath("/dosya-islemleri");
}

export async function updateFilePlanItemAction(
  planId: string,
  itemId: string,
  input: { title: string; description: string | null; isSelectable: boolean },
): Promise<FilePlanActionResult> {
  if (!input.title.trim()) return { error: "Başlık zorunludur." };
  try {
    await apiPut(`/classification/file-plans/${planId}/items/${itemId}`, {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      isSelectable: input.isSelectable,
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return { error: message(error, "Konu kodu güncellenemedi.") };
  }
}

export async function setFilePlanItemActiveAction(
  planId: string,
  itemId: string,
  isActive: boolean,
): Promise<FilePlanActionResult> {
  try {
    await apiPost(`/classification/file-plans/${planId}/items/${itemId}/active`, { isActive });
    refresh();
    return { ok: true };
  } catch (error) {
    return { error: message(error, "Konu kodunun durumu değiştirilemedi.") };
  }
}

/**
 * Konu kodunu kaldırır.
 *
 * Sunucu, koda bağlı belge, dijital dosya, fiziksel klasör ya da birim ataması
 * varsa reddeder ve gerekçeyi döner; mesaj olduğu gibi kullanıcıya taşınır.
 */
export async function deleteFilePlanItemAction(
  planId: string,
  itemId: string,
): Promise<FilePlanActionResult> {
  try {
    await apiDelete(`/classification/file-plans/${planId}/items/${itemId}`);
    refresh();
    return { ok: true };
  } catch (error) {
    return { error: message(error, "Konu kodu silinemedi.") };
  }
}

export async function renameFilePlanAction(planId: string, name: string): Promise<FilePlanActionResult> {
  if (!name.trim()) return { error: "Plan adı zorunludur." };
  try {
    await apiPut(`/classification/file-plans/${planId}`, { name: name.trim() });
    refresh();
    return { ok: true };
  } catch (error) {
    return { error: message(error, "Dosya planı adı güncellenemedi.") };
  }
}
