"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/api-client";
import type { LocationTypeItem } from "@/features/physical-archive/model/location";

export type LocationTypeResult = { types?: LocationTypeItem[]; error?: string };

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/** Seviye kataloğu konum ağacını ve seçicileri besliyor. */
function refresh() {
  revalidatePath("/arsiv-yerlesimi");
  revalidatePath("/arsiv-simulatoru");
  revalidatePath("/dosya-islemleri");
}

async function reload(): Promise<LocationTypeItem[]> {
  return apiGet<LocationTypeItem[]>("/physical-archive/locations/types", { cache: "no-store" });
}

export type LocationTypeInput = {
  code: string;
  name: string;
  level: number;
  canStoreFolder: boolean;
  allowsCapacity: boolean;
};

export async function saveLocationTypeAction(
  code: string | null,
  input: LocationTypeInput,
): Promise<LocationTypeResult> {
  if (!input.code.trim() || !input.name.trim())
    return { error: "Kod ve görünen ad zorunludur." };

  try {
    if (code) await apiPut(`/physical-archive/locations/types/${encodeURIComponent(code)}`, input);
    else await apiPost("/physical-archive/locations/types", input);
    refresh();
    return { types: await reload() };
  } catch (error) {
    return { error: message(error, "Seviye kaydedilemedi.") };
  }
}

export async function setLocationTypeActiveAction(code: string, isActive: boolean): Promise<LocationTypeResult> {
  try {
    await apiPost(`/physical-archive/locations/types/${encodeURIComponent(code)}/active`, { isActive });
    refresh();
    return { types: await reload() };
  } catch (error) {
    return { error: message(error, "Seviye durumu değiştirilemedi.") };
  }
}

export async function deleteLocationTypeAction(code: string): Promise<LocationTypeResult> {
  try {
    await apiDelete(`/physical-archive/locations/types/${encodeURIComponent(code)}`);
    refresh();
    return { types: await reload() };
  } catch (error) {
    return { error: message(error, "Seviye silinemedi.") };
  }
}
