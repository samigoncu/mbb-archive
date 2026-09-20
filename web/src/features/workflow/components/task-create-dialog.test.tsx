import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskCreateDialog } from "./task-create-dialog";

const api = vi.hoisted(() => ({
  findTaskDocuments: vi.fn(),
  getTaskAssignees: vi.fn(),
  assignTaskAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("../api/assignment-actions", () => ({
  findTaskDocuments: api.findTaskDocuments,
  getTaskAssignees: api.getTaskAssignees,
  assignTaskAction: api.assignTaskAction,
}));

vi.mock("@/components/action-form", () => ({
  ActionForm: ({ children, label }: { children: React.ReactNode; label: string }) => (
    <form aria-label={label}>
      {children}
      <button type="submit">{label}</button>
    </form>
  ),
}));

afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
});

describe("TaskCreateDialog", () => {
  it("opens dialog, searches documents, selects a document and moves to step 2", async () => {
    api.findTaskDocuments.mockResolvedValue({
      items: [
        { id: "doc-1", title: "İmar Planı Onayı", status: "Active" },
        { id: "doc-2", title: "Meclis Kararı", status: "Active" },
      ],
    });
    api.getTaskAssignees.mockResolvedValue({
      items: [
        { subjectId: "ahmet.yilmaz", unitName: "Yazı İşleri" },
        { subjectId: "mehmet.oz", unitName: "Yazı İşleri" },
      ],
    });

    render(<TaskCreateDialog />);

    // Trigger button
    const trigger = screen.getByRole("button", { name: "Yeni görev oluştur" });
    fireEvent.click(trigger);

    // Dialog title
    expect(await screen.findByText("Yeni Görev Oluştur ve Ata")).toBeTruthy();

    // Step 1: Document list shows up
    expect(await screen.findByText("İmar Planı Onayı")).toBeTruthy();

    // Click document to select
    fireEvent.click(screen.getByRole("button", { name: "İmar Planı Onayı" }));

    // Selected document banner appears
    expect(screen.getByText("Seçilen Belge:")).toBeTruthy();

    // Click next step button
    const nextBtn = screen.getByRole("button", { name: "Görev & Personel" });
    expect(nextBtn.hasAttribute("disabled")).toBe(false);
    fireEvent.click(nextBtn);

    // Step 2 is active
    expect(await screen.findByLabelText("Görev Başlığı")).toBeTruthy();
    expect(screen.getByText("Tamamlama Süresi (Dakika)")).toBeTruthy();

    // Quick template button works
    fireEvent.click(screen.getByText("+ Onay ve paraf incelemesi"));
    expect((screen.getByLabelText("Görev Başlığı") as HTMLInputElement).value).toBe("Onay ve paraf incelemesi");

    // Assignees loaded
    await waitFor(() => {
      expect(screen.getByText("ahmet.yilmaz · Yazı İşleri")).toBeTruthy();
    });

    // Form element has documentId
    const form = screen.getByRole("form", { name: "Görevi oluştur ve ata" });
    expect(form.querySelector<HTMLInputElement>('input[name="documentId"]')?.value).toBe("doc-1");
  });
});

