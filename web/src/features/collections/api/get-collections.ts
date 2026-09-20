import { ApiError, apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type {
  CollectionDetails,
  CollectionListItem,
} from "@/features/collections/model/collection";

export type CollectionsResult = {
  items: CollectionListItem[];
  error: string | null;
};

export async function getCollections(): Promise<CollectionsResult> {
  try {
    const result = await apiGet<PagedResult<CollectionListItem>>(
      "/collections?page=1&pageSize=100",
      { cache: "no-store" },
    );

    return { items: result.items ?? [], error: null };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        items: [],
        error:
          error.status === 403
            ? "Koleksiyonları görmek için collections.read izni gerekiyor."
            : `Koleksiyon servisi yanıt vermedi (${error.status}).`,
      };
    }

    return { items: [], error: "Koleksiyon servisine ulaşılamadı." };
  }
}

export async function getCollection(
  id: string,
): Promise<CollectionDetails | null> {
  try {
    return await apiGet<CollectionDetails>(
      `/collections/${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
  } catch {
    return null;
  }
}

/** Bir belgenin yer aldığı koleksiyonlar; belge görüntüleyicide kullanılır. */
export async function getCollectionsForDocument(
  documentId: string,
): Promise<CollectionListItem[]> {
  try {
    return await apiGet<CollectionListItem[]>(
      `/collections/by-document/${encodeURIComponent(documentId)}`,
      { cache: "no-store" },
    );
  } catch {
    return [];
  }
}
