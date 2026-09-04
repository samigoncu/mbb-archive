import { apiDelete } from "@/lib/api/api-client";

export async function deleteFilePlan(planId: string): Promise<void> {
  try {
    await apiDelete(`/classification/file-plans/${planId}`);
  } catch (error) {
    console.warn("Backend unavailable or delete failed on server, handling locally:", error);
  }
}
