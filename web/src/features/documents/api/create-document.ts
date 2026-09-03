import { apiPost } from "@/lib/api/api-client";

export type CreateDocumentRequest = {
  title: string;
};

export type CreateDocumentResponse = {
  id: string;
  title: string;
};

export async function createDocument(
  request: CreateDocumentRequest,
): Promise<CreateDocumentResponse> {
  return apiPost<CreateDocumentRequest, CreateDocumentResponse>(
    "/documents",
    request,
  );
}
