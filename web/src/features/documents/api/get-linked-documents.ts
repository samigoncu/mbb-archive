import { ApiError } from "@/lib/api/api-client";
import { getDocumentById, type DocumentDetails } from "./get-document-by-id";

export type LinkedDocument = { id: string; details: DocumentDetails | null };

/** Resolve only the visible page through the document API and its access scope. */
export async function getLinkedDocuments(ids: string[]): Promise<LinkedDocument[]> {
  const items: LinkedDocument[] = [];
  for (let offset = 0; offset < ids.length; offset += 6) {
    items.push(...await Promise.all(ids.slice(offset, offset + 6).map(async (id) => {
      try {
        return { id, details: await getDocumentById(id) };
      } catch (error) {
        if (error instanceof ApiError && [403, 404].includes(error.status)) {
          return { id, details: null };
        }
        throw error;
      }
    })));
  }
  return items;
}
