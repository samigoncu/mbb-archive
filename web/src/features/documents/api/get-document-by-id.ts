import { apiGet } from "@/lib/api/api-client";

export type DocumentDetails = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  archivedAt: string | null;
  versionCount: number;
};

export async function getDocumentById(
  id: string,
): Promise<DocumentDetails> {
  return apiGet<DocumentDetails>(`/documents/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
}
