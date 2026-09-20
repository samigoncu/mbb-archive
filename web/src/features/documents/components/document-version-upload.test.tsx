import { getUploadPolicy } from "@/features/settings/api/upload-policy";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentVersionUpload } from "./document-version-upload";
import { stageDocumentFile } from "../api/stage-document-file";
import { getVersionUploadStatus } from "../api/version-upload-actions";
import { ApiError } from "@/lib/api/api-error";

const { router } = vi.hoisted(() => ({ router: { refresh: vi.fn() } }));
const { refresh } = router;
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../api/stage-document-file", () => ({ stageDocumentFile: vi.fn() }));
vi.mock("../api/version-upload-actions", () => ({ getVersionUploadStatus: vi.fn() }));
vi.mock("@/features/settings/api/upload-policy", () => ({ getUploadPolicy: vi.fn() }));
const file = new File(["pdf content"], "imzalı.pdf", { type: "application/pdf" });

beforeEach(() => {
  vi.mocked(getUploadPolicy).mockResolvedValue({ maxFileSizeMb: 200, maxUploadBytes: 200 * 1024 * 1024, maximumAllowedMb: 2048, version: 1, updatedBy: "admin", updatedAt: null });
  vi.mocked(stageDocumentFile).mockResolvedValue({ ingestionId: "ingestion", documentId: "existing-doc", status: "PendingSecurityScan", sizeBytes: file.size, sha256Hash: "hash" });
  vi.mocked(getVersionUploadStatus).mockResolvedValue({ data: { status: "PendingSecurityScan", rejectionDetail: null, rejectionCode: null } });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });
async function openForm() {
  render(<DocumentVersionUpload documentId="existing-doc" currentVersion={1} archived={false} canUpload />);
  fireEvent.click(screen.getByRole("button", { name: "Yeni sürüm yükle" }));
  await screen.findByText(/En fazla 200 MB/);
  fireEvent.change(screen.getByLabelText("Yeni sürüm dosyası"), { target: { files: [file] } });
  fireEvent.change(screen.getByLabelText("Sürüm değişiklik gerekçesi"), { target: { value: "  İmzalı nüsha eklendi  " } });
}
function submit() { fireEvent.submit(screen.getByRole("button", { name: "Yeni sürümü gönder" }).closest("form")!); }

describe("Existing document version upload", () => {
  it("uploads to the existing document, waits for security approval and prevents duplicate submission", async () => {
    await openForm();
    const form = screen.getByRole("button", { name: "Yeni sürümü gönder" }).closest("form")!;
    fireEvent.submit(form); fireEvent.submit(form);
    await screen.findByText(/Dosya yüklendi. Güvenlik taraması bekleniyor/);
    expect(stageDocumentFile).toHaveBeenCalledTimes(1);
    expect(stageDocumentFile).toHaveBeenCalledWith("existing-doc", file, "İmzalı nüsha eklendi");
    expect(refresh).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Dosya işleniyor…" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("refreshes versions and preview only after the ingestion is accepted", async () => {
    vi.mocked(getVersionUploadStatus).mockResolvedValue({ data: { status: "Accepted", rejectionDetail: null, rejectionCode: null } });
    await openForm(); submit();
    await screen.findByText(/Yeni sürüm kaydedildi/);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("shows a security rejection without announcing a new version", async () => {
    vi.mocked(getVersionUploadStatus).mockResolvedValue({ data: { status: "Rejected", rejectionDetail: "Dosya güvenlik taramasından geçemedi.", rejectionCode: "unsafe" } });
    await openForm(); submit();
    expect((await screen.findByRole("alert")).textContent).toContain("güvenlik taramasından geçemedi");
    expect(refresh).not.toHaveBeenCalled();
  });
  it("allows retrying status lookup without uploading the same file again", async () => {
    vi.mocked(getVersionUploadStatus).mockResolvedValueOnce({ error: "Durum servisine erişilemiyor." });
    await openForm(); submit();
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Durumu yenile" }));
    await waitFor(() => expect(getVersionUploadStatus).toHaveBeenCalledTimes(2));
    expect(stageDocumentFile).toHaveBeenCalledTimes(1);
  });
  it("keeps permission failures visible and preserves the selected file", async () => {
    vi.mocked(stageDocumentFile).mockRejectedValue(new ApiError("Forbidden", 403));
    await openForm(); submit();
    expect((await screen.findByRole("alert")).textContent).toContain("yetkiniz yok");
    expect((screen.getByLabelText("Sürüm değişiklik gerekçesi") as HTMLTextAreaElement).value).toContain("İmzalı");
    expect(getVersionUploadStatus).not.toHaveBeenCalled();
  });
  it("rejects empty files, oversized files and blank reasons before upload", async () => {
    await openForm();
    fireEvent.change(screen.getByLabelText("Sürüm değişiklik gerekçesi"), { target: { value: "   " } });
    submit(); expect(screen.getByRole("alert").textContent).toContain("gerekçesini");
    fireEvent.change(screen.getByLabelText("Yeni sürüm dosyası"), { target: { files: [new File([], "empty.pdf")] } });
    submit(); expect(screen.getByRole("alert").textContent).toContain("Boş olmayan");
    const oversized = new File(["x"], "big.pdf");
    Object.defineProperty(oversized, "size", { value: 200 * 1024 * 1024 + 1 });
    fireEvent.change(screen.getByLabelText("Yeni sürüm dosyası"), { target: { files: [oversized] } });
    submit(); expect(screen.getByRole("alert").textContent).toContain("200 MB");
    expect(stageDocumentFile).not.toHaveBeenCalled();
  });
  it("explains archive immutability and does not offer upload", () => {
    render(<DocumentVersionUpload documentId="doc" currentVersion={1} archived canUpload />);
    expect(screen.getByText(/Arşivlenmiş belgenin içeriği değiştirilemez/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("does not offer upload without write permission", () => {
    render(<DocumentVersionUpload documentId="doc" currentVersion={1} archived={false} canUpload={false} />);
    expect(screen.getByText(/belge yazma yetkisi/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
