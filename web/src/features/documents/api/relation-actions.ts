"use server";
import { revalidatePath } from "next/cache";
import { apiGet, apiPost, apiPut, ApiError } from "@/lib/api/api-client";
import { getDocuments } from "./get-documents";
import { getLinkedDocuments } from "./get-linked-documents";
export type DocumentRelationItem={id:string;sourceDocumentId:string;targetDocumentId:string;kind:string;note:string;createdBy:string;createdAt:string;modifiedBy:string;modifiedAt:string;version:number;canManage:boolean;title?:string};
const message=(error:unknown)=>error instanceof ApiError ? error.message : "Belge ilişkisi işlemi tamamlanamadı.";
export async function getDocumentRelations(documentId:string):Promise<{items:DocumentRelationItem[];error?:string}> {
  try {const items=await apiGet<DocumentRelationItem[]>(`/documents/${encodeURIComponent(documentId)}/relations`,{cache:"no-store"});
    const linked=await getLinkedDocuments(items.map(item=>item.sourceDocumentId===documentId?item.targetDocumentId:item.sourceDocumentId));
    const names=new Map(linked.map(item=>[item.id,item.details?.title]));
    return {items:items.map(item=>({...item,title:names.get(item.sourceDocumentId===documentId?item.targetDocumentId:item.sourceDocumentId)??"Belgeyi aç"}))};
  }catch(error){return {items:[],error:message(error)};}
}
export async function searchRelationDocuments(search:string,page:number) {
  try {return {data:await getDocuments(Math.max(1,page),20,{search:search.trim()||undefined})};}
  catch(error){return {error:message(error)};}
}
export async function saveDocumentRelation(documentId:string,targetDocumentId:string,kind:string,note:string,relationId?:string,expectedVersion=0):Promise<{error?:string}> {
  if(!targetDocumentId||!note.trim())return {error:"İlgili belge ve açıklama gerekir."};
  try {const path=`/documents/${encodeURIComponent(documentId)}/relations`;const body={targetDocumentId,kind,note:note.trim(),expectedVersion};
    if(relationId)await apiPut(`${path}/${encodeURIComponent(relationId)}`,body);else await apiPost(path,body);
    revalidatePath(`/documents/${documentId}`);revalidatePath(`/documents/${targetDocumentId}`);return {};
  }catch(error){return {error:message(error)};}
}
export async function removeDocumentRelation(documentId:string,item:Pick<DocumentRelationItem,"id"|"version"|"targetDocumentId">,reason:string):Promise<{error?:string}> {
  if(!reason.trim())return {error:"Kaldırma gerekçesi gerekir."};
  try {await apiPost(`/documents/${encodeURIComponent(documentId)}/relations/${encodeURIComponent(item.id)}/remove`,{expectedVersion:item.version,reason:reason.trim()});
    revalidatePath(`/documents/${documentId}`);revalidatePath(`/documents/${item.targetDocumentId}`);return {};
  }catch(error){return {error:message(error)};}
}
