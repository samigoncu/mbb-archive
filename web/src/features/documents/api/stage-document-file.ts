import { ApiError } from "@/lib/api/api-error";

export type StageDocumentFileResponse = {
  ingestionId: string;
  documentId: string;
  status: string;
  sha256Hash: string;
  sizeBytes: number;
};

/**
 * Var olan bir belgeye dosya yükler. Belgede zaten sürüm varsa bu yeni bir
 * sürüm oluşturur; §5 gereği gerekçe kaydı için `reason` iletilir.
 */
export async function stageDocumentFile(
  documentId: string,
  file: File,
  reason?: string,
): Promise<StageDocumentFileResponse> {
  const response = await fetch(
    // Uygulama içi uç; jeton sunucu tarafında eklenir, tarayıcıya inmez.
    `/api/documents/${encodeURIComponent(documentId)}/files`,
    {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
        ...(reason?.trim()
          ? { "X-Version-Reason": encodeURIComponent(reason.trim()) }
          : {}),
      },
      body: file,
    },
  );

  if (!response.ok) {
    let detail = `Upload failed with ${response.status}.`;
    let code: string | undefined;

    try {
      const problem = (await response.json()) as {
        detail?: string;
        code?: string;
      };

      detail = problem.detail ?? detail;
      code = problem.code;
    } catch {
      // Non-JSON infrastructure response; HTTP status is still preserved.
    }

    throw new ApiError(detail, response.status, code);
  }

  return (await response.json()) as StageDocumentFileResponse;
}
