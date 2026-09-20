"use server";
import { apiGet, ApiError } from "@/lib/api/api-client";
export async function testWfsConnection(
  _previous: string,
  data: FormData,
): Promise<string> {
  const layer = String(data.get("layer") ?? "");
  if (!layer) return "Katman seçin.";
  try {
    const features = await apiGet<unknown[]>(
      `/geo/features/search?${new URLSearchParams({ layer, q: "", limit: "1" })}`,
      { cache: "no-store" },
    );
    return `WFS yanıtı alındı. Test sorgusunda ${features.length} nesne döndü.`;
  } catch (e) {
    return e instanceof ApiError
      ? e.message
      : "WFS test servisine ulaşılamadı.";
  }
}

export async function searchWfs(
  layer: string,
  q: string,
): Promise<{
  items: { featureId: string; name: string; layerName: string }[];
  error?: string;
}> {
  try {
    return {
      items: await apiGet(
        `/geo/features/search?${new URLSearchParams({ layer, q, limit: "25" })}`,
        { cache: "no-store" },
      ),
    };
  } catch (e) {
    return {
      items: [],
      error: e instanceof Error ? e.message : "WFS sorgusu tamamlanamadı.",
    };
  }
}
export async function importWfs(
  layer: string,
  featureId: string,
): Promise<string> {
  try {
    const { apiPost } = await import("@/lib/api/api-client");
    await apiPost("/geo/features/import", { layer, featureId });
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/harita");
    return "Nesne kurum harita kataloğuna alındı.";
  } catch (e) {
    return e instanceof Error ? e.message : "Nesne alınamadı.";
  }
}
