"use server";
import { getLocations } from "@/features/physical-archive/api/get-locations";
import { revalidatePath } from "next/cache";
import { ApiError, apiGet, apiPut } from "@/lib/api/api-client";
import { getScanContext } from "@/features/scanning/api/get-scan-context";
import type { DocumentFilingState, FilingChange, FilingEditorData } from "../model/document-filing";

export async function loadDocumentFilingAction(id: string): Promise<{ data: FilingEditorData } | { error: string }> {
  try {
    const current = await apiGet<DocumentFilingState>(`/documents/${encodeURIComponent(id)}/filing`, { cache: "no-store" });
    const choices = await getScanContext(current.ownerUnitId, false);
    let locations: FilingEditorData["locations"] = [];
    let locationError: string | undefined;
    try { locations = await getLocations(); }
    catch (error) { locationError = error instanceof ApiError ? error.message : "Fiziksel konumlar alınamadı."; }
    return { data: { current, choices, locations, locationError } };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Dosyalama bilgileri alınamadı." };
  }
}

export async function changeDocumentFilingAction(id: string, change: FilingChange): Promise<{ success: true } | { error: string }> {
  try {
    await apiPut(`/documents/${encodeURIComponent(id)}/filing`, change);
    for (const path of [`/documents/${id}`, "/documents", "/dosya-islemleri", "/arama", "/tarama", "/denetim-kayitlari"])
      revalidatePath(path);
    return { success: true };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Dosyalama kaydedilemedi. Mevcut atamalar korunuyor." };
  }
}
