import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AddFilePlanNodeDialog } from "./add-file-plan-node-dialog";
import { addFilePlanItem } from "../api/add-file-plan-item";
import type { FilePlanNode } from "../model/classification";

vi.mock("../api/add-file-plan-item", () => ({ addFilePlanItem: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const nodes: FilePlanNode[] = [
  { id: "n1", parentId: null, code: "805", title: "İmar İşleri", level: 1, isSelectable: false, isActive: true },
  { id: "n2", parentId: "n1", code: "805.01", title: "Plan Tadilatları", level: 2, isSelectable: true, isActive: true },
];

function open(defaultParentId: string | null = null) {
  const onNodeAdded = vi.fn();
  render(<AddFilePlanNodeDialog planId="plan" nodes={nodes} defaultParentId={defaultParentId} onNodeAdded={onNodeAdded} />);
  fireEvent.click(screen.getByRole("button", { name: /Yeni Konu Kodu Ekle/ }));
  return onNodeAdded;
}

it("derives the level from the chosen parent instead of trusting a typed number", async () => {
  vi.mocked(addFilePlanItem).mockResolvedValue({ id: "new" });
  const onNodeAdded = open();

  // Seviye artık elle girilen bir alan değil.
  expect(screen.queryByLabelText("Seviye")).toBeNull();

  fireEvent.click(await screen.findByRole("radio", { name: /805\.01/ }));
  expect(screen.getByText(/3\. seviye/)).toBeTruthy();

  fireEvent.change(screen.getByLabelText("Konu kodu"), { target: { value: "03" } });
  fireEvent.change(screen.getByLabelText("Konu başlığı"), { target: { value: "Revizyon talepleri" } });
  fireEvent.click(screen.getByRole("button", { name: "Konu kodunu ekle" }));

  await waitFor(() => expect(addFilePlanItem).toHaveBeenCalled());
  const [, payload] = vi.mocked(addFilePlanItem).mock.calls[0];
  // Önek üst koddan gelir; kullanıcı yalnız kendi parçasını yazar.
  expect(payload).toMatchObject({ parentId: "n2", code: "805.01.03", level: 3, isSelectable: true });
  expect(onNodeAdded).toHaveBeenCalled();
});

it("blocks a duplicate code before calling the API", async () => {
  open();
  fireEvent.click(await screen.findByRole("radio", { name: /805.*İmar İşleri/ }));
  fireEvent.change(screen.getByLabelText("Konu kodu"), { target: { value: "01" } });
  fireEvent.change(screen.getByLabelText("Konu başlığı"), { target: { value: "Çakışan" } });

  expect((await screen.findAllByText(/805\.01 bu planda zaten var/)).length).toBeGreaterThan(0);
  expect((screen.getByRole("button", { name: "Konu kodunu ekle" }) as HTMLButtonElement).disabled).toBe(true);
  expect(addFilePlanItem).not.toHaveBeenCalled();
});

it("keeps a failure visible on the form instead of only a toast", async () => {
  vi.mocked(addFilePlanItem).mockRejectedValue(new Error("Kod sunucuda reddedildi."));
  open();
  fireEvent.change(screen.getByLabelText("Konu kodu"), { target: { value: "900" } });
  fireEvent.change(screen.getByLabelText("Konu başlığı"), { target: { value: "Yeni ana grup" } });
  fireEvent.click(screen.getByRole("button", { name: "Konu kodunu ekle" }));

  expect((await screen.findByRole("alert")).textContent).toContain("Kod sunucuda reddedildi.");
});
