import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ScanIndexingStudio } from "./scan-indexing-studio";
import { uploadScannedDocumentAction } from "../api/stream-upload";
import { context, unit } from "../model/scan-context.fixtures";
import { toast } from "sonner";

vi.mock("../api/stream-upload", () => ({ uploadScannedDocumentAction: vi.fn() }));
vi.mock("../api/scan-context-action", () => ({ loadScanContextAction: vi.fn() }));
vi.mock("./network-scanner", () => ({ NetworkScanner: () => null }));
vi.mock("@/features/archive/components/post-upload-declare-dialog", () => ({
  PostUploadDeclareDialog: () => null,
}));
vi.mock("sonner", () => ({ toast: { loading: vi.fn(), success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:test");
  URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);
function setup(names = ["evrak.pdf"]) {
  const view = render(<ScanIndexingStudio units={[unit()]} initialContext={context()} metadataSchemas={[]} />);
  const files = names.map(name => new File(["pdf"], name, { type: "application/pdf" }));
  fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files } });
  fireEvent.submit(view.container.querySelector("form")!);
  return view;
}
it("üstveri şeması olmadan dosyayı yalnız bir kez aktarır", async () => {
  vi.mocked(uploadScannedDocumentAction).mockResolvedValue({ success: true, message: "Yüklendi" });
  setup();
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
  expect(uploadScannedDocumentAction).toHaveBeenCalledTimes(1);
  const data = vi.mocked(uploadScannedDocumentAction).mock.calls[0][0];
  expect(data.get("ownerUnitId")).toBe("bid");
  expect(data.get("title")).toBe("evrak");
  expect(data.getAll("files")).toHaveLength(1);
});
it("sunucu hatasını gösterir ve başarısız dosyayı korur", async () => {
  vi.mocked(uploadScannedDocumentAction).mockResolvedValue({ success: false, message: "Birim yetkisi kaldırıldı" });
  setup();
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Birim yetkisi kaldırıldı", { id: "scan-save" }));
  expect(toast.success).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toContain("Birim yetkisi kaldırıldı");
  expect(screen.getByText("1 dosya yüklemeye hazır.")).toBeTruthy();
});
it("reddedilen aktarım promise'ini yakalar", async () => {
  vi.mocked(uploadScannedDocumentAction).mockRejectedValue(new Error("connection closed"));
  setup();
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Yükleme sırasında bağlantı hatası oluştu.", { id: "scan-save" }));
  expect(toast.success).not.toHaveBeenCalled();
});
it("ikinci grup başarısız olduğunda başarılı grubu tekrar göndermez", async () => {
  vi.mocked(uploadScannedDocumentAction)
    .mockResolvedValueOnce({ success: true, message: "Yüklendi" })
    .mockResolvedValueOnce({ success: false, message: "Yüklenemedi" })
    .mockResolvedValueOnce({ success: true, message: "Yüklendi" });
  const view = setup(["bir.pdf", "separator.pdf", "iki.pdf"]);
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  fireEvent.submit(view.container.querySelector("form")!);
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
  expect(uploadScannedDocumentAction).toHaveBeenCalledTimes(3);
  const calls = vi.mocked(uploadScannedDocumentAction).mock.calls;
  expect(calls.map(([data]) => data.getAll("files").map(file => (file as File).name)))
    .toEqual([["bir.pdf"], ["iki.pdf"], ["iki.pdf"]]);
});

it("aktarımı belge bağlantısıyla saklar ve OCR sonucunu ayrı takip ettirir", async () => {
  vi.mocked(uploadScannedDocumentAction).mockResolvedValue({ success: true, message: "Yüklendi", documentId: "document-123", warnings: ["Üstveriyi kontrol edin"] });
  setup();
  await waitFor(() => expect(screen.getByRole("link", { name: "Belgeyi aç" }).getAttribute("href")).toBe("/documents/document-123"));
  expect(screen.getByRole("region", { name: "Aktarılan belgeler" }).textContent).toContain("Güvenlik taraması ve OCR sonucu ayrıca takip edilir.");
  expect(screen.getByText("Üstveriyi kontrol edin")).toBeTruthy();
  expect(screen.getByRole("link", { name: "OCR ve işlem takibi" }).getAttribute("href")).toBe("/islem-takibi");
  expect(screen.queryByRole("list", { name: "Aktarım dosyaları" })).toBeNull();
});
