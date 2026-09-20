"use server";
import { apiGet,ApiError } from "@/lib/api/api-client";
import type { DocumentText } from "./get-document-text";
export async function getDocumentVersionText(documentId:string,number:number):Promise<{data?:DocumentText;error?:string}> {
  if(!Number.isSafeInteger(number)||number<1)return {error:"Geçerli sürüm seçin."};
  try{return {data:await apiGet<DocumentText>(`/processing/documents/${encodeURIComponent(documentId)}/versions/${number}/text`,{cache:"no-store"})};}
  catch(error){return {error:error instanceof ApiError?error.message:"Sürümün OCR metni yüklenemedi."};}
}
