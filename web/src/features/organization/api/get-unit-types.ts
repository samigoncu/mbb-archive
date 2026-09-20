"use server";

import { apiGet } from "@/lib/api/api-client";
import { whenPermitted } from "@/lib/api/when-permitted";
import type { UnitTypeItem } from "@/features/organization/model/unit-type";

/**
 * Teşkilat seviyesi kataloğu.
 *
 * Birim ekleme ekranı ve seviye yönetimi buradan beslenir. Yetkisi olmayan
 * kullanıcıda boş döner; birim listesi seviyesiz de çalışır.
 */
export async function getUnitTypes(): Promise<UnitTypeItem[]> {
  return whenPermitted(
    apiGet<UnitTypeItem[]>("/organization/unit-types", { cache: "no-store" }),
    [],
  );
}
