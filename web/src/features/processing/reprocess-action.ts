"use server";
import { revalidatePath } from "next/cache";
import { apiPost, ApiError } from "@/lib/api/api-client";
export async function reprocessDocument(documentId:string,jobId:string):Promise<{error?:string}> {
  if(!documentId||!jobId)return {error:"Belge ve işlem kaydı gerekli."};
  try {await apiPost(`/processing/documents/${encodeURIComponent(documentId)}/reprocess?${new URLSearchParams({expectedJobId:jobId})}`,{});revalidatePath("/islem-takibi");revalidatePath(`/documents/${documentId}`);return {};}
  catch(error){return {error:error instanceof ApiError ? error.message : "Yeniden işleme başlatılamadı."};}
}
