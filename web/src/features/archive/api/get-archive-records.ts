import { apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type { ArchiveRecordListItem } from "@/features/archive/model/archive-record";

export const archiveRecordPageSize = 25;

export async function getArchiveRecords(
  page = 1,
  status?: string,
  pageSize = archiveRecordPageSize,
  documentId?: string,
): Promise<PagedResult<ArchiveRecordListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (status) {
    params.set("status", status);
  }

  if (documentId) {
    params.set("documentId", documentId);
  }

  return apiGet<PagedResult<ArchiveRecordListItem>>(
    `/archive/records?${params}`,
    { cache: "no-store" },
  );
}

export async function getArchiveRecordByDocumentId(
  documentId: string,
): Promise<ArchiveRecordListItem | null> {
  const result = await getArchiveRecords(1, undefined, 1, documentId);
  return result.items?.[0] ?? null;
}
