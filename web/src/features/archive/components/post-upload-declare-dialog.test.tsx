import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostUploadDeclareDialog } from "./post-upload-declare-dialog";
import { declareArchiveRecordAction } from "@/features/archive/api/declare-record-action";
import { getDeclarationOptionsAction } from "@/features/archive/api/get-declaration-options-action";
import { toast } from "sonner";

vi.mock("@/features/archive/api/declare-record-action", () => ({
  declareArchiveRecordAction: vi.fn(),
}));

vi.mock("@/features/archive/api/get-declaration-options-action", () => ({
  getDeclarationOptionsAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("PostUploadDeclareDialog", () => {
  const onOpenChange = vi.fn();
  const onDeclared = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDeclarationOptionsAction).mockResolvedValue({
      filePlanItems: [
        {
          id: "plan-1",
          code: "805.01",
          title: "Yazışmalar",
          description: null,
          parentId: null,
          level: 1,
          isSelectable: true,
          isActive: true,
        },
      ],
      retentionRules: [
        {
          id: "rule-1",
          code: "SDP-805.01",
          name: "İdari Yazışmalar",
          retentionMonths: 60,
          action: "ArchiveTransfer",
          createdAt: "2026-01-01T00:00:00Z",
          caseCount: 0,
        },
      ],
    });
  });

  afterEach(cleanup);

  it("renders document title and allows declaration", async () => {
    render(
      <PostUploadDeclareDialog
        isOpen={true}
        onOpenChange={onOpenChange}
        documentId="doc-1"
        documentTitle="Test İmar Evrakı.pdf"
        initialClassificationCode="805.01"
        onDeclared={onDeclared}
      />,
    );

    expect(screen.getByText("Test İmar Evrakı.pdf")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Kayıt Beyanı/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Resmi Kayıt Beyan Et/i })).toBeTruthy();
    });

    const submitBtn = screen.getByRole("button", { name: /Resmi Kayıt Beyan Et/i });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it("closes modal on cancel button click", async () => {
    render(
      <PostUploadDeclareDialog
        isOpen={true}
        onOpenChange={onOpenChange}
        documentId="doc-1"
        documentTitle="Test İmar Evrakı.pdf"
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Daha Sonra Beyan Et/i })).toBeTruthy();
    });

    const cancelBtn = screen.getByRole("button", { name: /Daha Sonra Beyan Et/i });
    fireEvent.click(cancelBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
