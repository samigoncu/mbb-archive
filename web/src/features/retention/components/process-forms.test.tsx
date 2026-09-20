import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProcessStepForm } from "./process-forms";
import type { Disposition } from "../model/disposition";
import { advanceDispositionAction } from "../api/disposition-actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../api/disposition-actions", () => ({
  createDispositionAction: vi.fn(), advanceDispositionAction: vi.fn(), changeHoldAction: vi.fn(), createRuleAction: vi.fn(), configureCommissionAction: vi.fn(), delegateCommissionAction: vi.fn(), createTransferPackageAction: vi.fn(),
}));
const process: Disposition = {
  id: "01999999-1111-7111-8111-111111111111", retentionCaseId: "01999999-2222-7222-8222-222222222222",
  documentId: "01999999-3333-7333-8333-333333333333", action: "Transfer", status: "UnderReview",
  reason: "Devir", commissionReference: "K-1", createdBy: "preparer", createdAt: "2026-09-05T00:00:00Z",
  requiredReviews: 2, approvedBy: null, approvedAt: null, approvalReference: null, completedBy: null,
  completedAt: null, receivingArchive: null, receiptReference: null, version: 4, reviews: [],
  commissionValidFrom: null, commissionValidUntil: null, members: [], transferPackageId: null,
  transferManifestSha256: null, transferPackageSha256: null, transferPackageSize: null, packageCreatedBy: null,
  packageCreatedAt: null, packageVerifiedBy: null, packageVerifiedAt: null, executionEvidenceDocumentId: null,
  executionEvidenceVersionId: null, executionEvidenceSha256: null, executionMethod: null, executionLocation: null,
  executionWitnesses: null, physicalExecutedAt: null,
};

describe("Komisyon işlem formu", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);
  it("sunucunun bloke hatasını başarı gibi göstermeden kullanıcıya aktarır", async () => {
    vi.mocked(advanceDispositionAction).mockResolvedValue({ status: "error", message: "Etkin hukuki bloke var." });
    render(<ProcessStepForm process={process} operation="reviews" label="Görüşü kaydet" />);
    fireEvent.change(screen.getByLabelText("Komisyon görüşü"), { target: { value: "approve" } });
    fireEvent.change(screen.getByLabelText("Görüş gerekçesi"), { target: { value: "Uygun görüldü" } });
    fireEvent.submit(screen.getByRole("button", { name: "Görüşü kaydet" }).closest("form")!);
    expect((await screen.findByRole("alert")).textContent).toContain("Etkin hukuki bloke var.");
    const data = vi.mocked(advanceDispositionAction).mock.calls[0][1];
    expect(data.get("version")).toBe("4");
    expect(data.get("decision")).toBe("approve");
  });
  it("fiziksel imhada dijital korumayı ve zorunlu kanıt alanlarını açıkça gösterir", () => {
    render(<ProcessStepForm process={{ ...process, action: "Destroy", status: "Approved" }} operation="execute-destruction" label="Fiziksel imha kaydını tamamla" />);
    expect(screen.getByText(/Dijital asıllar, tüm sürümler/).textContent).toContain("kalıcı korunur");
    expect((screen.getByLabelText("Tutanak sürümünün kimliği") as HTMLInputElement).required).toBe(true);
    expect((screen.getByLabelText("Gerçekleşme tarihi ve saati") as HTMLInputElement).required).toBe(true);
    expect((screen.getByLabelText("Tanıklar ve görevleri") as HTMLInputElement).required).toBe(true);
  });
  it("bekleyen istek sırasında ikinci gönderimi devre dışı bırakır", async () => {
    let finish!: (value: { status: "success"; message: string }) => void;
    vi.mocked(advanceDispositionAction).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<ProcessStepForm process={process} operation="submit" label="Gönder" />);
    fireEvent.submit(screen.getByRole("button", { name: "Gönder" }).closest("form")!);
    expect((await screen.findByRole("button", { name: "Kaydediliyor…" }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => finish({ status: "success", message: "Kaydedildi." }));
    expect((await screen.findByRole("status")).textContent).toBe("Kaydedildi.");
  });
});
