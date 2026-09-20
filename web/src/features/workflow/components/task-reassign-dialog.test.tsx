import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TaskReassignDialog } from "./task-reassign-dialog";

const api = vi.hoisted(() => ({
  getTaskAssignees: vi.fn(),
  assignTaskAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("../api/assignment-actions", () => ({
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

describe("TaskReassignDialog", () => {
  const dummyItem = {
    id: "work-item-1",
    instanceId: "inst-1",
    definitionId: "def-1",
    definitionName: "İnceleme Süreci",
    documentId: "doc-1",
    nodeName: "Mevzuat Kontrolü",
    permission: "workflow.task.complete",
    status: "Open" as const,
    createdAt: "2026-09-19",
    dueAt: null,
    isOverdue: false,
    version: 1,
    assigneeSubjectId: "ali.kaya",
  };

  it("opens reassign dialog, loads candidates and shows current assignee", async () => {
    api.getTaskAssignees.mockResolvedValue({
      items: [{ subjectId: "veli.can", unitName: "Hukuk" }],
    });

    render(<TaskReassignDialog item={dummyItem} documentTitle="Dava Dosyası" />);

    // Trigger button should say "Yeniden ata"
    const trigger = screen.getByRole("button", { name: /Yeniden ata/i });
    fireEvent.click(trigger);

    // Dialog contents
    expect(await screen.findByText("Görevi Başka Personele Ata")).toBeTruthy();
    expect(screen.getByText(/ali.kaya/)).toBeTruthy();
    expect(screen.getByText(/Dava Dosyası/)).toBeTruthy();

    // Candidates loaded
    await waitFor(() => {
      expect(screen.getByText("veli.can · Hukuk")).toBeTruthy();
    });

    // Form inputs exist
    const form = screen.getByRole("form", { name: "Atamayı güncelle" });
    expect(form.querySelector<HTMLInputElement>('input[name="workItemId"]')?.value).toBe("work-item-1");
  });
});

