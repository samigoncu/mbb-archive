"use server";
import { apiGet, apiPut } from "@/lib/api/api-client";
import { revalidatePath } from "next/cache";
export type UploadPolicy = { maxFileSizeMb: number; maxUploadBytes: number; maximumAllowedMb: number; version: number; updatedBy: string; updatedAt: string | null };
export async function getUploadPolicy(): Promise<UploadPolicy> {
  return apiGet<UploadPolicy>("/documents/upload-policy", { cache: "no-store" });
}
export async function saveUploadPolicy(maxFileSizeMb: number, expectedVersion: number): Promise<{ data?: UploadPolicy; error?: string }> {
  try {
    const data = await apiPut<object, UploadPolicy>("/documents/upload-policy", { maxFileSizeMb, expectedVersion });
    revalidatePath("/ayarlar"); revalidatePath("/tarama");
    return { data };
  } catch (error) { return { error: error instanceof Error ? error.message : "Ayar kaydedilemedi." }; }
}
