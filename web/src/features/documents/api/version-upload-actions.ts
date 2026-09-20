"use server";

import { ApiError, apiGet } from "@/lib/api/api-client";
import { revalidatePath } from "next/cache";

export async function getVersionUploadStatus(documentId: string, ingestionId: string) {
  try {
    const data = await apiGet<{
      status: string;
      rejectionDetail: string | null;
      rejectionCode: string | null;
    }>(`/documents/${encodeURIComponent(documentId)}/ingestions/${encodeURIComponent(ingestionId)}`, { cache: "no-store" });
    if (data?.status === "Accepted") {
      revalidatePath("/islem-takibi");
      revalidatePath(`/documents/${documentId}`);
    }
    return { data };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Yükleme durumu alınamadı." };
  }
}
