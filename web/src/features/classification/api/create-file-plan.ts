"use server";

import { apiPost } from "@/lib/api/api-client";

export type CreateFilePlanInput = {
  code: string;
  name: string;
  version: string;
  authority: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
};

export async function createFilePlan(
  input: CreateFilePlanInput,
): Promise<{ id: string }> {
  return await apiPost<CreateFilePlanInput, { id: string }>(
    "/classification/file-plans",
    input,
  );
}
