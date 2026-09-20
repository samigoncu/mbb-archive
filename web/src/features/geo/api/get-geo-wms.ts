import "server-only";
import { apiGet } from "@/lib/api/api-client";
import type { WmsMapLayer } from "@/features/geo/model/geo-admin";

/**
 * Haritada çizilecek WMS katmanları.
 *
 * Yapılandırma eksikse ya da yetki yoksa harita katmansız açılır; CBS isteğe
 * bağlı bir entegrasyon, yokluğu sayfayı düşürmemeli.
 */
export async function getWmsMapLayers(): Promise<WmsMapLayer[]> {
  try {
    return await apiGet<WmsMapLayer[]>("/geo/wms/layers", { cache: "no-store" });
  } catch {
    return [];
  }
}
