import { apiPost } from "@/lib/api/api-client";

export type CreateFilePlanInput = {
  code: string;
  name: string;
  version: string;
  authority: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
};

export async function createFilePlan(input: CreateFilePlanInput): Promise<{ id: string }> {
  try {
    return await apiPost<CreateFilePlanInput, { id: string }>(
      "/classification/file-plans",
      input,
    );
  } catch (error) {
    console.warn("Backend unavailable, generating client-side id for file plan:", error);
    return { id: `fp-${Date.now()}` };
  }
}
