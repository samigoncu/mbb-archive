"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiGet, apiPost, apiPut, ApiError } from "@/lib/api/api-client";
import type { UnitTypeItem } from "@/features/organization/model/unit-type";

export type UnitTypeResult = { types?: UnitTypeItem[]; error?: string };

const message = (error: unknown, fallback: string) =>
  error instanceof ApiError && error.message ? error.message : fallback;

/** Yazma sonrası liste tazelenir; sayımlar ve alt seviye kuralları değişmiş olabilir. */
async function reload(): Promise<UnitTypeResult> {
  revalidatePath("/tanimlamalar/birim-seviyeleri");
  revalidatePath("/tanimlamalar/birimler");
  return { types: await apiGet<UnitTypeItem[]>("/organization/unit-types", { cache: "no-store" }) };
}

export async function saveUnitTypeAction(
  code: string,
  body: { name: string; level: number; canHoldMembers: boolean },
  isNew: boolean,
): Promise<UnitTypeResult> {
  try {
    const path = `/organization/unit-types/${encodeURIComponent(code)}`;
    if (isNew) await apiPost(path, body);
    else await apiPut(path, body);
    return await reload();
  } catch (error) {
    return { error: message(error, "Seviye kaydedilemedi.") };
  }
}

export async function setUnitTypeActiveAction(code: string, isActive: boolean): Promise<UnitTypeResult> {
  try {
    await apiPost(`/organization/unit-types/${encodeURIComponent(code)}/active`, { isActive });
    return await reload();
  } catch (error) {
    return { error: message(error, "Seviye durumu değiştirilemedi.") };
  }
}

export async function deleteUnitTypeAction(code: string): Promise<UnitTypeResult> {
  try {
    await apiDelete(`/organization/unit-types/${encodeURIComponent(code)}`);
    return await reload();
  } catch (error) {
    return { error: message(error, "Seviye silinemedi.") };
  }
}

/** Bir birimin teşkilat seviyesini değiştirir; boş kod seviyeyi kaldırır. */
export async function setUnitTypeAction(
  unitId: string,
  typeCode: string | null,
): Promise<{ error?: string }> {
  try {
    await apiPost(`/organization/units/${encodeURIComponent(unitId)}/type`, { typeCode });
    revalidatePath("/tanimlamalar/birimler");
    revalidatePath("/tanimlamalar/yetkiler");
    return {};
  } catch (error) {
    return { error: message(error, "Birim seviyesi değiştirilemedi.") };
  }
}
