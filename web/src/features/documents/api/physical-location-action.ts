"use server";
import { getLocations } from "@/features/physical-archive/api/get-locations";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { ApiError } from "@/lib/api/api-client";

export async function loadPhysicalLocationsAction() {
  try {
    const user = await getCurrentUser();
    if (!user?.isAuthenticated || !(user.isBootstrapAdministrator || user.permissions.includes("physical-archive.manage")))
      return { error: "Fiziksel klasör taşıma yetkiniz yok." };
    return { locations: await getLocations() };
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Fiziksel konumlar alınamadı. Yeniden deneyin." };
  }
}
