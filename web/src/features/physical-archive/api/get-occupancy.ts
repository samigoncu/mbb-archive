import { apiGet } from "@/lib/api/api-client";
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
};

export async function getLocationOccupancy(): Promise<LocationOccupancyItem[]> {
  return apiGet<LocationOccupancyItem[]>(
    "/physical-archive/locations/occupancy",
    { cache: "no-store" },
  );
}
