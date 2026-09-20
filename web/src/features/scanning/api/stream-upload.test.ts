import { beforeEach, expect, it, vi } from "vitest";
import { uploadScannedDocumentAction } from "./stream-upload";
import { prepareScannedDocumentAction, completeScannedDocumentAction } from "./upload-actions";
import { stageDocumentFile } from "@/features/documents/api/stage-document-file";
vi.mock("./upload-actions", () => ({ prepareScannedDocumentAction: vi.fn(), completeScannedDocumentAction: vi.fn() }));
vi.mock("@/features/documents/api/stage-document-file", () => ({ stageDocumentFile: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); });
it("keeps binary content out of server actions and streams the original File", async () => {
  vi.mocked(prepareScannedDocumentAction).mockResolvedValue({ success: true, documentId: "doc", message: "" });
  vi.mocked(completeScannedDocumentAction).mockResolvedValue({ success: true, message: "done" });
  const data = new FormData(); const file = new File(["pdf"], "test.pdf");
  data.append("files", file); data.set("title", "Test"); data.set("ownerUnitId", "unit");
  expect((await uploadScannedDocumentAction(data)).success).toBe(true);
  const metadata = vi.mocked(prepareScannedDocumentAction).mock.calls[0][0];
  expect(metadata.getAll("files")).toEqual([]); expect(metadata.get("ownerUnitId")).toBe("unit");
  expect(stageDocumentFile).toHaveBeenCalledWith("doc", file);
  expect(completeScannedDocumentAction).toHaveBeenCalledWith("doc", metadata);
});
it("does not announce completion or finalize metadata after upload failure", async () => {
  vi.mocked(prepareScannedDocumentAction).mockResolvedValue({ success: true, documentId: "doc", message: "" });
  vi.mocked(stageDocumentFile).mockRejectedValue(new Error("Boyut sınırı değişti"));
  const data = new FormData(); data.append("files", new File(["pdf"], "test.pdf"));
  expect(await uploadScannedDocumentAction(data)).toMatchObject({ success: false, documentId: "doc", message: "Boyut sınırı değişti" });
  expect(completeScannedDocumentAction).not.toHaveBeenCalled();
});
