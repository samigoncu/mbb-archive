"use server";
import { revalidatePath } from "next/cache";
import { apiPost, ApiError } from "@/lib/api/api-client";

export async function changeDocumentCancellation(documentId: string, cancel: boolean,
  request: { expectedVersion: number; requestId: string; reason: string }): Promise<{ error?: string; success?: boolean }> {
  try {
    await apiPost(`/documents/${encodeURIComponent(documentId)}/${cancel ? "cancel" : "restore"}`, request);
    for (const path of ["/documents", `/documents/${documentId}`, "/arama", "/dosya-islemleri", "/tarama"]) revalidatePath(path);
    return { success: true };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "İşlem sonucu alınamadı. Belge durumunu kontrol edin veya yeniden deneyin." };
  }
}
