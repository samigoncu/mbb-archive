import { stageDocumentFile } from "@/features/documents/api/stage-document-file";
import { prepareScannedDocumentAction, completeScannedDocumentAction, type UploadScanResult } from "./upload-actions";
export async function uploadScannedDocumentAction(formData: FormData): Promise<UploadScanResult> {
  const files = formData.getAll("files").filter((entry): entry is File => typeof entry !== "string" && entry.size > 0);
  const metadata = new FormData();
  for (const [key, value] of formData.entries()) if (typeof value === "string") metadata.append(key, value);
  const prepared = await prepareScannedDocumentAction(metadata, files.map(file => ({ name: file.name, type: file.type, size: file.size })));
  if (!prepared.success || !prepared.documentId) return prepared;
  try { for (const file of files) await stageDocumentFile(prepared.documentId, file); }
  catch (error) { return { success: false, documentId: prepared.documentId, message: error instanceof Error ? error.message : "Dosya aktarımı tamamlanamadı. Belge kaydını kontrol edin." }; }
  return completeScannedDocumentAction(prepared.documentId, metadata);
}
