"use server";

import { revalidatePath } from "next/cache";
import {
  ApiError,
  apiPost,
  getServerApiBaseUrl,
} from "@/lib/api/api-client";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

const maxUploadBytes = 200 * 1024 * 1024;

type StageResponse = {
  ingestionId: string;
  documentId: string;
  status: string;
  sha256Hash: string;
  sizeBytes: number;
};

/**
 * Belge kaydı oluşturur ve dosyayı hazırlık alanına yükler. Sonrasını
 * boru hattı devralır: güvenlik taraması → arşive alma → OCR → indeksleme.
 */
export async function uploadDocumentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Bir dosya seçmelisiniz." };
  }

  if (file.size > maxUploadBytes) {
    return { status: "error", message: "Dosya boyutu 200 MB sınırını aşıyor." };
  }

  try {
    const document = await apiPost<{ title: string }, { id: string }>("/documents", {
      title: title || file.name,
    });

    const staged = await stageFile(document.id, file);

    revalidatePath("/tarama");
    revalidatePath("/documents");

    return {
      status: "success",
      message: `${file.name} yüklendi (${formatBytes(staged.sizeBytes)}). Güvenlik taraması kuyruğa alındı.`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof ApiError ? error.message : "Yükleme tamamlanamadı.",
    };
  }
}

async function stageFile(documentId: string, file: File): Promise<StageResponse> {
  const response = await fetch(
    `${getServerApiBaseUrl()}/documents/${documentId}/files`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: await file.arrayBuffer(),
    },
  );

  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as { detail?: string };
    throw new ApiError(
      problem.detail ?? `Dosya yüklenemedi (${response.status}).`,
      response.status,
    );
  }

  return (await response.json()) as StageResponse;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
