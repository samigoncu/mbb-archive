import { apiGet } from "@/lib/api/api-client";

export type DocumentText = {
  documentId: string;
  hasText: boolean;
  text: string;
  characterCount: number;
  isTruncated: boolean;
};

/**
 * OCR / metin katmanı arama projeksiyonundan okunur. Boru hattı henüz metni
 * üretmediyse `hasText` false döner; bu hata değildir.
 */
export async function getDocumentText(
  documentId: string,
): Promise<DocumentText | null> {
  try {
    return await apiGet<DocumentText>(
      `/search/documents/${encodeURIComponent(documentId)}/text`,
      { cache: "no-store" },
    );
  } catch {
    return null;
  }
}
