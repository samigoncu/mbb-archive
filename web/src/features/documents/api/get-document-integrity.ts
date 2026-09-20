import { apiGet } from "@/lib/api/api-client";

export type DocumentIntegrity = {
  documentId: string;
  versionNumber: number;
  mimeType: string;
  sizeBytes: number;
  sha256Hash: string;
  wormProtected?: boolean;
  wormMode?: string;
  fixityStatus?: string;
};

/**
 * Henüz depolanmış sürümü olmayan belgede 404 döner; bu bir hata değil, dosyanın
 * hâlâ boru hattında olduğu anlamına gelir.
 */
export async function getDocumentIntegrity(
  documentId: string,
): Promise<DocumentIntegrity | null> {
  try {
    return await apiGet<DocumentIntegrity>(
      `/documents/${encodeURIComponent(documentId)}/integrity`,
      { cache: "no-store" },
    );
  } catch {
    return null;
  }
}
