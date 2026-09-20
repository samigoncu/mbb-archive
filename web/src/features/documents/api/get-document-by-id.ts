import { apiGet } from "@/lib/api/api-client";

export type DocumentDetails = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  archivedAt: string | null;
  versionCount: number;
  concurrencyVersion?: number;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  currentVersionNumber?: number | null;
};

export async function getDocumentById(
  id: string,
): Promise<DocumentDetails> {
  return apiGet<DocumentDetails>(`/documents/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
}
