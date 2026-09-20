"use server";
import { apiGet,ApiError } from "@/lib/api/api-client";
export type OriginalProtectionStatus={versionId:string;versionNumber:number;storageVersionId:string|null;checkedAt:string|null;retainUntil:string|null;legalHold:boolean;error:string|null};
export async function getDocumentProtection(documentId:string):Promise<{items:OriginalProtectionStatus[];error?:string}> {
 try{return {items:await apiGet<OriginalProtectionStatus[]>(`/documents/${encodeURIComponent(documentId)}/protection`,{cache:"no-store"})};}
 catch(error){return {items:[],error:error instanceof ApiError?error.message:"Depo koruması bilgisi alınamadı."};}
}
