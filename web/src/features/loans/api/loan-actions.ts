"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiPost } from "@/lib/api/api-client";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

export async function returnLoanAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const loanId = String(formData.get("loanId") ?? "").trim();

  if (!loanId) {
    return { status: "error", message: "Ödünç kaydı bulunamadı." };
  }

  try {
    await apiPost<Record<string, never>, void>(
      `/physical-archive/loans/${loanId}/return`,
      {},
    );
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ApiError ? error.message : "İade alınamadı.",
    };
  }

  revalidatePath("/odunc");
  revalidatePath("/dosya-islemleri");

  return { status: "success", message: "Dosya iade alındı." };
}
