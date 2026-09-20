"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiPost } from "@/lib/api/api-client";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

/**
 * Görev tamamlama iş akışını bir sonraki düğüme taşır. Sonuç değeri tanımdaki
 * geçiş koşullarıyla eşleşmelidir; eşleşmezse backend reddeder ve akış
 * ilerlemez.
 */
export async function completeWorkflowTaskAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const instanceId = String(formData.get("instanceId") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim();

  if (!instanceId) {
    return { status: "error", message: "İş akışı örneği bulunamadı." };
  }

  if (!outcome) {
    return { status: "error", message: "Sonuç değeri girilmelidir." };
  }

  try {
    await apiPost<{ outcome: string; variables: Record<string, string> }, void>(
      `/workflows/instances/${instanceId}/complete-task`,
      { outcome, variables: {} },
    );
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError ? error.message : "Görev tamamlanamadı.",
    };
  }

  revalidatePath("/gorevlerim");

  return { status: "success", message: "Görev tamamlandı." };
}
