import { ApiError, getPublicApiBaseUrl } from "@/lib/api/api-client";

export type StageDocumentFileResponse = {
  ingestionId: string;
  documentId: string;
  status: string;
  sha256Hash: string;
  sizeBytes: number;
};

export async function stageDocumentFile(
  documentId: string,
  file: File,
): Promise<StageDocumentFileResponse> {
  const response = await fetch(
    `${getPublicApiBaseUrl()}/documents/${encodeURIComponent(documentId)}/files`,
    {
      method: "POST",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
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
