"use server";

import { apiGet } from "@/lib/api/api-client";
import { whenPermitted } from "@/lib/api/when-permitted";
import type { LocationTypeItem } from "@/features/physical-archive/model/location";

/**
 * Yerleşim seviyesi kataloğu.
 *
 * Bina, oda, dolap, raf gibi seviyeler artık koda gömülü değil; arayüz
 * etiketleri, iç içe geçme kuralı ve kapasite davranışı buradan gelir.
 */
export async function getLocationTypes(): Promise<LocationTypeItem[]> {
  // Yetkisi olmayan kullanıcıda boş liste; gerçek kesinti yükselir —
  // yoksa API çöktüğünde ekran "seviye tanımlı değil" gibi görünürdü.
  return whenPermitted(
    apiGet<LocationTypeItem[]>("/physical-archive/locations/types", { cache: "no-store" }),
    [],
  );
}
