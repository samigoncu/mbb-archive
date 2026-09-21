"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiDelete, apiPost } from "@/lib/api/api-client";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

/**
 * Belgeyi haritadaki kurumsal nesneyle ilişkilendirir (§9). Aynı belge-nesne-tür
 * üçlüsü ikinci kez gönderildiğinde backend kopya oluşturmaz.
 */
export async function createGeoRelationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const geoEntityId = String(formData.get("geoEntityId") ?? "").trim();
  const relationType = String(formData.get("relationType") ?? "").trim();

  if (!documentId || !geoEntityId) {
    return { status: "error", message: "Coğrafi nesne seçilmelidir." };
  }

  if (!relationType) {
    return { status: "error", message: "İlişki türü seçilmelidir." };
  }

  try {
    await apiPost<
      { geoEntityId: string; relationType: string; validFrom: null; validTo: null },
      { id: string }
    >(`/geo/documents/${documentId}/relations`, {
      geoEntityId,
      relationType,
      validFrom: null,
      validTo: null,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError ? error.message : "İlişki kurulamadı.",
    };
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/harita");

  return { status: "success", message: "Harita ilişkisi kuruldu." };
}

/**
 * İlişkiyi kapatır. Kayıt silinmez; hangi kararın hangi dönemde hangi nesneyi
 * etkilediği geçmişte kalır.
 */
export async function closeGeoRelationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const relationId = String(formData.get("relationId") ?? "").trim();

  if (!documentId || !relationId) {
    return { status: "error", message: "İlişki bulunamadı." };
  }

  try {
    await apiDelete(`/geo/documents/${documentId}/relations/${relationId}`);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError ? error.message : "İlişki kapatılamadı.",
    };
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/harita");

  return { status: "success", message: "İlişki kapatıldı." };
}

export async function searchGeoEntitiesAction(search: string) {
  const { getGeoEntities } = await import("@/features/geo/api/get-geo");
  const result = await getGeoEntities({ search });
  return result.items;
}

export async function getGeoEntityDetailsAction(id: string) {
  const { getGeoEntity } = await import("@/features/geo/api/get-geo");
  return await getGeoEntity(id);
}

export type DetectedBuilding = {
  id: number;
  name: string;
  buildingType: string;
  polygon: Array<{ lat: number; lng: number }>;
  areaSquareMeters: number;
};

function isPointInPoly(point: { lat: number; lng: number }, vs: Array<{ lat: number; lng: number }>): boolean {
  const x = point.lng;
  const y = point.lat;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].lng;
    const yi = vs[i].lat;
    const xj = vs[j].lng;
    const yj = vs[j].lat;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function calcPolyArea(coords: Array<{ lat: number; lng: number }>): number {
  if (coords.length < 3) return 0;
  const radius = 6378137;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    const rad1 = (p1.lat * Math.PI) / 180;
    const rad2 = (p2.lat * Math.PI) / 180;
    const deltaLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    area += deltaLng * (2 + Math.sin(rad1) + Math.sin(rad2));
  }
  return Math.abs((area * radius * radius) / 2.0);
}

/**
 * Tıklanan koordinattaki binanın tam poligonunu OpenStreetMap üzerinden tespit eder.
 */
export async function detectBuildingAtCoordinateAction(
  lat: number,
  lng: number,
): Promise<{ success: boolean; building?: DetectedBuilding; message?: string }> {
  try {
    const d = 0.0008; // ~80m kapsama alanı
    const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
    const url = `https://api.openstreetmap.org/api/0.6/map.json?bbox=${bbox}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MbbArchiveGIS/1.0 (archive@malatya.bel.tr)",
      },
    });
    clearTimeout(timer);

    if (!response.ok) {
      return { success: false, message: "Harita servisinden yanıt alınamadı." };
    }

    const data = (await response.json()) as { elements?: Array<Record<string, unknown>> };
    if (!Array.isArray(data.elements)) {
      return { success: false, message: "Bina verisi bulunamadı." };
    }

    const nodesMap = new Map<number, { lat: number; lng: number }>();
    for (const el of data.elements) {
      if (el.type === "node" && typeof el.id === "number" && typeof el.lat === "number" && typeof el.lon === "number") {
        nodesMap.set(el.id, { lat: el.lat, lng: el.lon });
      }
    }

    const buildings: Array<{
      id: number;
      tags?: Record<string, string>;
      polygon: Array<{ lat: number; lng: number }>;
    }> = [];

    for (const el of data.elements) {
      const tags = (el.tags ?? {}) as Record<string, string>;
      if (el.type === "way" && typeof el.id === "number" && (tags.building || tags.amenity || tags.shop)) {
        const nodes = Array.isArray(el.nodes) ? (el.nodes as number[]) : [];
        const polygon = nodes.map((nid) => nodesMap.get(nid)).filter((p): p is { lat: number; lng: number } => Boolean(p));

        if (polygon.length >= 3) {
          const cleanPoly =
            polygon.length > 3 &&
            polygon[0].lat === polygon[polygon.length - 1].lat &&
            polygon[0].lng === polygon[polygon.length - 1].lng
              ? polygon.slice(0, -1)
              : polygon;

          buildings.push({ id: el.id, tags, polygon: cleanPoly });
        }
      }
    }

    if (buildings.length === 0) {
      return { success: false, message: "Tıklanan koordinatta haritada kayıtlı bir bina bulunamadı." };
    }

    // 1. Tıklanan noktanın içinde kaldığı binayı ara
    let matched = buildings.find((b) => isPointInPoly({ lat, lng }, b.polygon));

    // 2. Eğer tam içine tıklanmadıysa en yakın binayı seç
    if (!matched) {
      let minDist = Infinity;
      for (const b of buildings) {
        for (const p of b.polygon) {
          const dist = Math.hypot(lat - p.lat, lng - p.lng);
          if (dist < minDist) {
            minDist = dist;
            matched = b;
          }
        }
      }
    }

    if (!matched) {
      return { success: false, message: "Bina geometrisi bulunamadı." };
    }

    const name =
      matched.tags?.name ||
      matched.tags?.["addr:street"] ||
      (matched.tags?.building && matched.tags.building !== "yes" ? `Bina (${matched.tags.building})` : "Yapı / Bina");

    const area = calcPolyArea(matched.polygon);

    return {
      success: true,
      building: {
        id: matched.id,
        name,
        buildingType: matched.tags?.building || "Bina",
        polygon: matched.polygon,
        areaSquareMeters: area,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bina arama servisi meşgul";
    return { success: false, message: msg };
  }
}
