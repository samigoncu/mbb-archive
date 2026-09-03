import { apiGet } from "@/lib/api/api-client";
import type {
  LocationListItem,
  LocationType,
} from "@/features/physical-archive/model/location";

export async function getLocations(
  type?: LocationType,
): Promise<LocationListItem[]> {
  const query = type ? `?type=${encodeURIComponent(type)}` : "";

  return apiGet<LocationListItem[]>(`/physical-archive/locations${query}`, {
    cache: "no-store",
  });
}
