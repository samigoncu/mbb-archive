"use server";

import { apiGet } from "@/lib/api/api-client";
import type { LocationTypeItem } from "@/features/physical-archive/model/location";

/**
 * Yerleşim seviyesi kataloğu.
 *
 * Bina, oda, dolap, raf gibi seviyeler artık koda gömülü değil; arayüz
 * etiketleri, iç içe geçme kuralı ve kapasite davranışı buradan gelir.
 */
export async function getLocationTypes(): Promise<LocationTypeItem[]> {
  try {
    return await apiGet<LocationTypeItem[]>("/physical-archive/locations/types", { cache: "no-store" });
  } catch {
    return [];
  }
}
