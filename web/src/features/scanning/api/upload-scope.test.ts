import { beforeEach, expect, it, vi } from "vitest";
import { ApiError, apiPost } from "@/lib/api/api-client";
import { getScanContext } from "./get-scan-context";
import { context } from "../model/scan-context.fixtures";
import { uploadScannedDocumentAction } from "./upload-actions";
vi.mock("@/features/settings/api/upload-policy", () => ({ getUploadPolicy: vi.fn(async () => ({ maxUploadBytes: 200 * 1024 * 1024 })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./get-scan-context", () => ({ getScanContext: vi.fn() }));
vi.mock("@/lib/api/api-client", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api/api-client")>(), apiPost: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getScanContext).mockResolvedValue(context()); });
function data(fields: Record<string, string | undefined>) {
  const form = new FormData(); form.set("ownerUnitId", "bid"); form.set("title", "Test");
  form.append("files", new File(["PDF test"], "test.pdf", { type: "application/pdf" }));
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) form.set(key, value);
  return form;
}
it.each([
  { folderId: "other-folder" },
  { dossierId: "other-dossier" },
  { filePlanId: "other-plan", filePlanItemId: "foreign-topic" },
  { dossierId: "digital-bid", filePlanId: "plan", filePlanItemId: "physical-topic" },
  { folderId: "physical-bid", filePlanId: "plan", filePlanItemId: "topic" },
])("birim veya SDP dışı seçimle belge kaydı bile oluşturmaz: %j", async fields => {
  const result = await uploadScannedDocumentAction(data(fields));
  expect(result.success).toBe(false); expect(apiPost).not.toHaveBeenCalled();
});
it("ekran açıldıktan sonra kaldırılan birim yetkisini gönderimde tekrar kontrol eder", async () => {
  vi.mocked(getScanContext).mockRejectedValue(new ApiError("Yetki kaldırıldı", 403));
  const result = await uploadScannedDocumentAction(data({}));
  expect(result.message).toBe("Yetki kaldırıldı"); expect(apiPost).not.toHaveBeenCalled();
});
