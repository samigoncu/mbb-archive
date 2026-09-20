"use server";

import { revalidatePath } from "next/cache";
import { ApiError, apiPost } from "@/lib/api/api-client";

export type CmsValidationState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Başarılı doğrulamanın künyesi; ekran sonucu hemen gösterir. */
  result?: {
    id: string;
    kind: string;
    status: string;
    provider: string;
    contentSha256: string;
    reportJson: string;
  };
};

type EvidenceValidationResponse = {
  id: string;
  kind: string;
  status: string;
  provider: string;
  contentSha256: string;
  reportJson: string;
};

/**
 * İmza doğrulaması kriptografik bir işlemdir ve sonucu backend belirler;
 * burada yalnızca taşıma yapılır. "Geçersiz" sonuç bir hata değildir, gerçek
 * bir doğrulama çıktısıdır ve olduğu gibi gösterilir.
 */
export async function validateCmsSignatureAction(
  _previous: CmsValidationState,
  formData: FormData,
): Promise<CmsValidationState> {
  const signatureBase64 = String(formData.get("signatureBase64") ?? "").trim();
  const detachedContentBase64 = String(
    formData.get("detachedContentBase64") ?? "",
  ).trim();
  const documentId = String(formData.get("documentId") ?? "").trim();

  if (!signatureBase64) {
    return { status: "error", message: "İmza dosyası seçilmelidir." };
  }

  try {
    const result = await apiPost<
      {
        documentId: string | null;
        documentVersionId: null;
        signatureBase64: string;
        detachedContentBase64: string | null;
      },
      EvidenceValidationResponse
    >("/evidence/cms/validate", {
      documentId: documentId || null,
      documentVersionId: null,
      signatureBase64,
      detachedContentBase64: detachedContentBase64 || null,
    });

    revalidatePath("/kanit");

    return {
      status: "success",
      message: "Doğrulama tamamlandı.",
      result,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof ApiError
          ? error.message
          : "Doğrulama servisi yanıt vermedi.",
    };
  }
}
