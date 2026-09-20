import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FilePlanNodeActions } from "./file-plan-node-actions";
import {
  deleteFilePlanItemAction,
  setFilePlanItemActiveAction,
  updateFilePlanItemAction,
} from "../api/file-plan-actions";
import type { FilePlanNode } from "../model/classification";

vi.mock("../api/file-plan-actions", () => ({
  updateFilePlanItemAction: vi.fn(),
  setFilePlanItemActiveAction: vi.fn(),
  deleteFilePlanItemAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const node: FilePlanNode = {
  id: "i1", parentId: null, code: "934.01", title: "Mal Alım İşi",
  level: 2, isSelectable: true, isActive: true, description: null,
};

it("edits title, description and selectability without exposing the code", async () => {
  vi.mocked(updateFilePlanItemAction).mockResolvedValue({ ok: true });
  render(<FilePlanNodeActions planId="p1" node={node} hasChildren={false} onChanged={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: /Düzenle/ }));
  // Kod alanı yok: belgeler ve dosyalar koda bağlı.
  expect(screen.queryByLabelText("Konu kodu")).toBeNull();

  fireEvent.change(await screen.findByLabelText("Konu başlığı"), { target: { value: "Mal Alım İşleri" } });
  fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

  await waitFor(() => expect(updateFilePlanItemAction).toHaveBeenCalledWith("p1", "i1", {
    title: "Mal Alım İşleri", description: null, isSelectable: true,
  }));
});

it("hides permanent delete while the code has children and offers deactivation", async () => {
  vi.mocked(setFilePlanItemActiveAction).mockResolvedValue({ ok: true });
  render(<FilePlanNodeActions planId="p1" node={node} hasChildren onChanged={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: /Kaldır/ }));
  expect(await screen.findByText(/altında başka konular var/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Kalıcı olarak sil" })).toBeNull();
});

it("surfaces the server's reason when a used code cannot be deleted", async () => {
  vi.mocked(deleteFilePlanItemAction).mockResolvedValue({
    error: "Bu konu koduna sınıflandırılmış belgeler var. Silmek yerine konuyu pasife alın.",
  });
  render(<FilePlanNodeActions planId="p1" node={node} hasChildren={false} onChanged={vi.fn()} />);

  fireEvent.click(screen.getByRole("button", { name: /Kaldır/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Kalıcı olarak sil" }));

  expect((await screen.findByRole("alert")).textContent).toContain("sınıflandırılmış belgeler var");
});
