import { apiGet } from "@/lib/api/api-client";
import type { GeoRelatedDocument } from "@/features/geo/model/geo";

/**
 * Harita ekranının seçim değişince çağırdığı uç. Tarayıcı API'ye doğrudan
 * gitmez: erişim jetonu httpOnly çerezde durur ve istemci paketine hiç
 * düşmez. Belge listesi yine API'de kapsam süzgecinden geçer (§21).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const documents = await apiGet<GeoRelatedDocument[]>(
      `/geo/entities/${encodeURIComponent(id)}/documents`,
      { cache: "no-store" },
    );

    return Response.json(documents, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json([], {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
