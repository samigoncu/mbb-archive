"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiPost } from "@/lib/api/api-client";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

export async function returnLoanAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const loanId = String(formData.get("loanId") ?? "").trim();
  const returnNote = String(formData.get("returnNote") ?? "").trim();

  if (!loanId) {
    return { status: "error", message: "Ödünç kaydı bulunamadı." };
  }

  try {
    await apiPost<{ returnNote?: string | null }, void>(
      `/physical-archive/loans/${loanId}/return`,
      { returnNote: returnNote || null },
    );
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ApiError ? error.message : "İade alınamadı.",
    };
  }

  revalidatePath("/odunc");
  revalidatePath("/dosya-islemleri");

  return { status: "success", message: "Dosya başarıyla iade alındı ve arşive kaydedildi." };
}

export async function checkoutLoanAction(
  _previous: ActionState,
  data: FormData,
): Promise<ActionState> {
  const value = (key: string) => String(data.get(key) ?? "").trim();
  if (
    !value("folderId") ||
    !value("borrowerSubjectId") ||
    !value("purpose") ||
    !value("dueAt")
  )
    return { status: "error", message: "Tüm alanlar zorunludur." };
  try {
    const currentUser = await getCurrentUser().catch(() => null);
    const checkedOutBy = value("checkedOutBy") || currentUser?.subject || undefined;

    await apiPost(
      `/physical-archive/folders/${encodeURIComponent(value("folderId"))}/checkout`,
      {
        borrowerSubjectId: value("borrowerSubjectId"),
        purpose: value("purpose"),
        dueAt: `${value("dueAt")}T23:59:59+03:00`,
        checkedOutBy,
      },
    );
    revalidatePath("/odunc");
    revalidatePath("/dosya-islemleri");
    return { status: "success", message: "Dosya ödünç verildi." };
  } catch (e) {
    let msg = e instanceof ApiError ? e.message : "Ödünç kaydedilemedi.";
    if (
      msg.includes("Folder already has an active loan") ||
      msg.includes("active_loan") ||
      msg.includes("aktif bir ödünç")
    ) {
      msg = "Bu klasör şu anda zaten ödünç verilmiş durumda (etkin bir zimmet kaydı bulunuyor).";
    } else if (
      msg.includes("Only available folder can be checked out") ||
      msg.includes("Only a folder on loan")
    ) {
      msg = "Yalnızca arşivde müsait durumda bulunan klasörler ödünç verilebilir.";
    }
    return {
      status: "error",
      message: msg,
    };
  }
}
