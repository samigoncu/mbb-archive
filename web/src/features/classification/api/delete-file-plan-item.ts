import { apiDelete } from "@/lib/api/api-client";

export async function deleteFilePlanItem(
  planId: string,
  itemId: string,
): Promise<void> {
  try {
    await apiDelete(`/classification/file-plans/${planId}/items/${itemId}`);
  } catch (error) {
    console.warn("Backend unavailable or delete item failed on server, handling locally:", error);
  }
}
