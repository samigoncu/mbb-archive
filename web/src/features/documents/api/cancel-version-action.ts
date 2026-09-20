"use server";
import { revalidatePath } from "next/cache";
import { ApiError, apiPost } from "@/lib/api/api-client";

export async function cancelVersionAction(documentId: string, number: number, request: {
  expectedVersion: number; requestId: string; reason: string; replacementVersionNumber: number | null;
}) {
  try {
    await apiPost(`/documents/${encodeURIComponent(documentId)}/versions/${number}/cancel`, request);
    revalidatePath(`/documents/${documentId}`);
    revalidatePath("/documents");
    revalidatePath("/arama");
    return { success: true };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "İptal sonucu alınamadı. Sürüm durumunu kontrol edin veya aynı işlemi yeniden deneyin." };
  }
}
