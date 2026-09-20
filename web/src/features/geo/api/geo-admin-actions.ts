"use server";

import { revalidatePath } from "next/cache";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api/api-client";
import type {
  DiscoveredLayer,
  GeoConfiguration,
  GeoServiceKind,
} from "@/features/geo/model/geo-admin";

export type GeoResult = { data?: GeoConfiguration; error?: string };

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/** Harita ayarı hem ayarlar ekranında hem haritada okunur. */
function refresh() {
  revalidatePath("/ayarlar");
  revalidatePath("/harita");
}

export async function loadGeoConfigurationAction(): Promise<GeoResult> {
  try {
    return { data: await apiGet<GeoConfiguration>("/geo/admin", { cache: "no-store" }) };
  } catch (error) {
    return { error: message(error, "CBS yapılandırması okunamadı.") };
  }
}

export async function saveBasemapAction(input: {
  tileUrl: string;
  attribution: string;
  centerLatitude: number;
  centerLongitude: number;
  zoom: number;
  expectedVersion: number;
}): Promise<GeoResult> {
  try {
    const data = await apiPut<typeof input, GeoConfiguration>("/geo/admin/basemap", input);
    refresh();
    return { data };
  } catch (error) {
    return { error: message(error, "Harita altlığı kaydedilemedi.") };
  }
}

export type ServiceInput = {
  kind: GeoServiceKind;
  title: string;
  baseUrl: string;
  userName: string;
  /** null gönderilirse mevcut parola korunur; "" parolayı siler. */
  password: string | null;
  timeoutSeconds: number;
};

export async function saveServiceAction(id: string | null, input: ServiceInput): Promise<GeoResult> {
  try {
    const data = id
      ? await apiPut<ServiceInput, GeoConfiguration>(`/geo/admin/services/${id}`, input)
      : await apiPost<ServiceInput, GeoConfiguration>("/geo/admin/services", input);
    refresh();
    return { data };
  } catch (error) {
    return { error: message(error, "Servis kaydedilemedi.") };
  }
}

export async function setServiceActiveAction(id: string, isActive: boolean): Promise<GeoResult> {
  try {
    const data = await apiPost<{ isActive: boolean }, GeoConfiguration>(`/geo/admin/services/${id}/active`, { isActive });
    refresh();
    return { data };
  } catch (error) {
    return { error: message(error, "Servis durumu değiştirilemedi.") };
  }
}

export async function deleteServiceAction(id: string): Promise<GeoResult> {
  try {
    const data = await apiDelete<GeoConfiguration>(`/geo/admin/services/${id}`);
    refresh();
    return { data };
  } catch (error) {
    return { error: message(error, "Servis silinemedi.") };
  }
}

export type LayerInput = {
  layerName: string;
  title: string;
  entityType: string;
  nameAttribute: string;
  visibleByDefault: boolean;
  opacityPercent: number;
  imageFormat: string | null;
  isQueryable: boolean;
};

export async function saveLayerAction(
  serviceId: string,
  layerId: string | null,
  input: LayerInput,
): Promise<GeoResult> {
  try {
    const data = layerId
      ? await apiPut<LayerInput, GeoConfiguration>(`/geo/admin/services/${serviceId}/layers/${layerId}`, input)
      : await apiPost<LayerInput, GeoConfiguration>(`/geo/admin/services/${serviceId}/layers`, input);
    refresh();
    return { data };
  } catch (error) {
    return { error: message(error, "Katman kaydedilemedi.") };
  }
}

export async function removeLayerAction(serviceId: string, layerId: string): Promise<GeoResult> {
  try {
    const data = await apiDelete<GeoConfiguration>(`/geo/admin/services/${serviceId}/layers/${layerId}`);
    refresh();
    return { data };
  } catch (error) {
    return { error: message(error, "Katman kaldırılamadı.") };
  }
}

/** GetCapabilities'i okur; hiçbir şey kaydetmez. */
export async function discoverLayersAction(
  serviceId: string,
): Promise<{ layers?: DiscoveredLayer[]; error?: string }> {
  try {
    return { layers: await apiPost<Record<string, never>, DiscoveredLayer[]>(`/geo/admin/services/${serviceId}/discover`, {}) };
  } catch (error) {
    return { error: message(error, "Katman listesi alınamadı.") };
  }
}
