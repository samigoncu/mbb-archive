"use server";

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
  return await apiPost<AddFilePlanItemInput, { id: string }>(
    `/classification/file-plans/${planId}/items`,
    input,
  );
}
