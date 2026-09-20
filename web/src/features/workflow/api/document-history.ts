"use server";
import { apiGet, ApiError } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
export type DocumentWorkflowItem = { id:string;instanceId:string;definitionName:string;nodeName:string;instanceStatus:string;status:string;createdAt:string;dueAt:string|null;assigneeSubjectId:string|null;assignedBy:string|null;assignedAt:string|null;completedBy:string|null;completedAt:string|null;outcome:string|null;escalationLevel:number };
export async function getDocumentWorkflowHistory(documentId:string,page=1):Promise<{data?:PagedResult<DocumentWorkflowItem>;error?:string}> {
  try { return {data:await apiGet<PagedResult<DocumentWorkflowItem>>(`/workflows/documents/${encodeURIComponent(documentId)}/history?page=${Math.max(1,page)}&pageSize=25`,{cache:"no-store"})}; }
  catch(error) {return {error:error instanceof ApiError ? error.status===403 ? "İş akışı geçmişini görüntüleme yetkiniz yok." : error.message : "İş akışı geçmişi yüklenemedi."};}
}
