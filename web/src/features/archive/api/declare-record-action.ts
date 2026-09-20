"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiPost } from "@/lib/api/api-client";
import { getArchiveRecordByDocumentId } from "./get-archive-records";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

/**
 * Beyan geri alınamaz: kayıt değişmez hâle gelir ve saklama takvimi işlemeye
 * başlar. Bu yüzden sınıflandırma ve saklama kuralı burada boş geçilemez;
 * kodların geçerliliğini backend doğrular.
 */
export async function declareArchiveRecordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let recordId = String(formData.get("recordId") ?? "").trim();
  const documentId = String(formData.get("documentId") ?? "").trim();
  const classificationCode = String(formData.get("classificationCode") ?? "").trim();
  const retentionRuleCode = String(formData.get("retentionRuleCode") ?? "").trim();

  if (!recordId && documentId) {
    try {
      const record = await getArchiveRecordByDocumentId(documentId);
      if (record) {
        recordId = record.id;
      }
    } catch {
      // devam et ve recordId kontrolüne takıl
    }
  }

  if (!recordId) {
    return { status: "error", message: "Arşiv kaydı henüz hazır değil veya bulunamadı. Lütfen biraz sonra tekrar deneyin." };
  }

  if (!classificationCode) {
    return { status: "error", message: "Dosya planı kodu seçilmelidir." };
  }

  if (!retentionRuleCode) {
    return { status: "error", message: "Saklama kuralı seçilmelidir." };
  }

  try {
    await apiPost<{ classificationCode: string; retentionRuleCode: string }, void>(
      `/archive/records/${recordId}/declare`,
      { classificationCode, retentionRuleCode },
    );
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError
          ? error.message
          : "Kayıt beyanı tamamlanamadı.",
    };
  }

  revalidatePath("/kayit-beyani");
  revalidatePath("/devir-imha");

  return { status: "success", message: "Kayıt beyan edildi." };
}

/**
 * Birden fazla aday kaydı tek seferde seçilen dosya planı ve saklama kuralıyla
 * kurumsal kayıt olarak beyan eder.
 */
export async function bulkDeclareArchiveRecordsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const recordIdsRaw = String(formData.get("recordIds") ?? "").trim();
  const classificationCode = String(formData.get("classificationCode") ?? "").trim();
  const retentionRuleCode = String(formData.get("retentionRuleCode") ?? "").trim();

  const recordIds = recordIdsRaw
    ? recordIdsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (recordIds.length === 0) {
    return { status: "error", message: "Beyan edilecek kayıt seçilmedi." };
  }

  if (!classificationCode) {
    return { status: "error", message: "Dosya planı kodu seçilmelidir." };
  }

  if (!retentionRuleCode) {
    return { status: "error", message: "Saklama kuralı seçilmelidir." };
  }

  let successCount = 0;
  const errors: string[] = [];

  const results = await Promise.allSettled(
    recordIds.map((id) =>
      apiPost<{ classificationCode: string; retentionRuleCode: string }, void>(
        `/archive/records/${id}/declare`,
        { classificationCode, retentionRuleCode },
      ),
    ),
  );

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    if (res.status === "fulfilled") {
      successCount++;
    } else {
      const err = res.reason;
      errors.push(
        err instanceof ApiError
          ? err.message
          : `Kayıt ${recordIds[i].slice(0, 8)} beyan edilemedi.`,
      );
    }
  }

  revalidatePath("/kayit-beyani");
  revalidatePath("/devir-imha");

  if (errors.length > 0 && successCount === 0) {
    return {
      status: "error",
      message: `Toplu beyan başarısız oldu: ${errors[0]}`,
    };
  }

  if (errors.length > 0) {
    return {
      status: "success",
      message: `${successCount} kayıt beyan edildi. (${errors.length} kayıtta hata oluştu).`,
    };
  }

  return {
    status: "success",
    message: `Seçilen ${successCount} kayıt başarıyla kurumsal kayıt olarak beyan edildi.`,
  };
}
