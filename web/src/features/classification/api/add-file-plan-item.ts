import { apiPost } from "@/lib/api/api-client";

export type AddFilePlanItemInput = {
  parentId?: string | null;
  code: string;
  title: string;
  level: number;
  isSelectable: boolean;
};

export async function addFilePlanItem(
  planId: string,
  input: AddFilePlanItemInput,
): Promise<{ id: string }> {
  try {
    return await apiPost<AddFilePlanItemInput, { id: string }>(
      `/classification/file-plans/${planId}/items`,
      input,
    );
  } catch (error) {
    console.warn("Backend unavailable, generating client-side id for node:", error);
    return { id: `node-${Date.now()}` };
  }
}
