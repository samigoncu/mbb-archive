"use server";

import { apiPost, ApiError } from "@/lib/api/api-client";
import { revalidatePath } from "next/cache";
export async function synchronizeProtection() {
  try {
    const result = await apiPost<Record<string, never>, {providerSupported: boolean; checked: number; protected: number; failed: number}>("/documents/protection/synchronize", {});
    revalidatePath("/ayarlar");
    return { error: result.failed > 0, message: `${result.checked} nesne kontrol edildi; ${result.protected} doğrulandı, ${result.failed} hata. Hatalı nesneler sonraki eşitlemede yeniden denenir.` };
  } catch (error) { return { error: true, message: error instanceof ApiError ? error.message : "Dijital koruma eşitlenemedi." }; }
}
