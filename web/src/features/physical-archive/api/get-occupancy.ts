"use server";

import { apiGet } from "@/lib/api/api-client";
import { whenPermitted } from "@/lib/api/when-permitted";
import type { LocationType } from "@/features/physical-archive/model/location";

export type LocationOccupancyItem = {
  id: string;
  parentId: string | null;
  type: LocationType;
  code: string;
  name: string;
  barcode: string;
  capacity: number | null;
  folderCount: number;
  isActive: boolean;
  /** Seviyenin görünen adı ve kuralları; sunucuda katalogla birleştirilir. */
  typeName: string;
  level: number;
  canStoreFolder: boolean;
  allowsCapacity: boolean;
};

export async function getLocationOccupancy(): Promise<LocationOccupancyItem[]> {
  return whenPermitted(
    apiGet<LocationOccupancyItem[]>(
      "/physical-archive/locations/occupancy",
      { cache: "no-store" },
    ),
    [],
  );
}
