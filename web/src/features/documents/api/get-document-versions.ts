"use server";

import { apiGet } from "@/lib/api/api-client";

export type DocumentVersionSummary = {
  versionNumber: number;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
  createdBy: string;
  reason: string | null;
  createdAt: string;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
};

/** Sürümler değişmezdir; düzeltme yeni sürüm olarak eklenir. Yeniden eskiye sıralı. */
export async function getDocumentVersions(
  documentId: string,
): Promise<DocumentVersionSummary[]> {
  return await apiGet<DocumentVersionSummary[]>(
      `/documents/${encodeURIComponent(documentId)}/versions`,
      { cache: "no-store" },
    );
}
