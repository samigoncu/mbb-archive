import { ApiError, apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type {
  GeoEntityDetails,
  GeoEntitySummary,
  GeoMapSettings,
  GeoRelatedDocument,
  GeoRelationDetails,
} from "@/features/geo/model/geo";

export type GeoEntitiesResult = {
  items: GeoEntitySummary[];
  error: string | null;
};

export async function getGeoEntities(
  filter: { search?: string; entityType?: string; bbox?: string } = {},
): Promise<GeoEntitiesResult> {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });

  if (filter.search) params.set("search", filter.search);
  if (filter.entityType) params.set("entityType", filter.entityType);
  if (filter.bbox) params.set("bbox", filter.bbox);

  try {
    const result = await apiGet<PagedResult<GeoEntitySummary>>(
      `/geo/entities?${params}`,
      { cache: "no-store" },
    );

    return { items: result.items ?? [], error: null };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        items: [],
        error:
          error.status === 403
            ? "Harita katalogunu görmek için geo.read izni gerekiyor."
            : `CBS servisi yanıt vermedi (${error.status}).`,
      };
    }

    return { items: [], error: "CBS servisine ulaşılamadı." };
  }
}

export async function getGeoEntity(id: string): Promise<GeoEntityDetails | null> {
  try {
    return await apiGet<GeoEntityDetails>(
      `/geo/entities/${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
  } catch {
    return null;
  }
}

/** §18: haritadan belgeye. */
export async function getGeoEntityDocuments(
  id: string,
): Promise<GeoRelatedDocument[]> {
  try {
    return await apiGet<GeoRelatedDocument[]>(
      `/geo/entities/${encodeURIComponent(id)}/documents`,
      { cache: "no-store" },
    );
  } catch {
    return [];
  }
}

/** §18: belgeden haritaya. */
export async function getDocumentGeoRelations(
  documentId: string,
): Promise<GeoRelationDetails[]> {
  try {
    return await apiGet<GeoRelationDetails[]>(
      `/geo/documents/${encodeURIComponent(documentId)}/relations`,
      { cache: "no-store" },
    );
  } catch {
    return [];
  }
}

export async function getGeoMapSettings(): Promise<GeoMapSettings | null> {
  try {
    return await apiGet<GeoMapSettings>("/geo/settings", { cache: "no-store" });
  } catch {
    return null;
  }
}
