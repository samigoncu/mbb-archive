"use server";

import { apiGet, ApiError } from "@/lib/api/api-client";
import { getFolders } from "@/features/physical-archive/api/get-folders";
import type { PagedResult } from "@/features/documents/model/document";
import type { FolderListItem } from "@/features/physical-archive/model/folder";

export type LoanBorrower = { subjectId: string; unitName: string };
type SelectionResult<T> = { data?: PagedResult<T>; error?: string };

export async function searchLoanFolders(query: string, page: number): Promise<SelectionResult<FolderListItem>> {
  if (query.length > 100 || !Number.isSafeInteger(page) || page < 1) return { error: "Arama veya sayfa geçersiz." };
  try { return { data: await getFolders(page, 25, { status: "Available", title: query.trim() }) }; }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Dosyalar alınamadı." }; }
}

export async function searchLoanBorrowers(query: string, page: number): Promise<SelectionResult<LoanBorrower>> {
  if (query.length > 100 || !Number.isSafeInteger(page) || page < 1) return { error: "Arama veya sayfa geçersiz." };
  try { return { data: await apiGet<PagedResult<LoanBorrower>>(`/physical-archive/borrowers?${new URLSearchParams({q: query.trim(), page: String(page)})}`, { cache: "no-store" }) }; }
  catch (error) { return { error: error instanceof ApiError ? error.message : "Personel listesi alınamadı." }; }
}
