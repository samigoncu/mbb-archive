import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NewFolderDialog } from "./folder-dialogs";
import { createFolderAction } from "../api/folder-actions";

vi.mock("../api/folder-actions", () => ({ createFolderAction: vi.fn(), moveFolderAction: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

/** Sekiz seviyeli hiyerarşi: eski kademeli select'ler her seviye için bir alan açıyordu. */
const locations = [
  { id: "kurum", parentId: null, type: "InstitutionArchive" as const, code: "MBB", name: "Kurum Arşivi", barcode: "L0", isActive: true, typeName: "Kurum Arşivi", canStoreFolder: false},
  { id: "bina", parentId: "kurum", type: "Building" as const, code: "B1", name: "Ana Hizmet Binası", barcode: "L1", isActive: true, typeName: "Bina", canStoreFolder: false},
  { id: "dolap", parentId: "bina", type: "Cabinet" as const, code: "D1", name: "Kompakt Dolap 1", barcode: "L2", isActive: true, typeName: "Dolap", canStoreFolder: false},
  { id: "raf1", parentId: "dolap", type: "Shelf" as const, code: "RAF-1", name: "Raf 1", barcode: "L3", isActive: true, typeName: "Raf", canStoreFolder: true},
  { id: "raf2", parentId: "dolap", type: "Shelf" as const, code: "RAF-2", name: "Raf 2", barcode: "L4", isActive: true, typeName: "Raf", canStoreFolder: true},
  { id: "pasif", parentId: "dolap", type: "Shelf" as const, code: "RAF-9", name: "Kapatılmış Raf", barcode: "L5", isActive: false, typeName: "Raf", canStoreFolder: true},
];
const units = [{ id: "unit", name: "Bilgi İşlem", path: "/bi", parentId: null, isActive: true, isPrimary: true, canManageDocuments: true, canManagePhysical: true }];
const nodes = [{ id: "n1", code: "934.01", title: "Mal Alım İşi", isActive: true, isSelectable: true, level: 2, parentId: null }] as never[];
const assignments = [{ unitId: "unit", planId: "p", itemId: "n1", code: "934.01", title: "Mal Alım İşi", version: "2024 V.4" }];

function open() {
  render(<NewFolderDialog locations={locations} units={units} nodes={nodes} assignments={assignments} ownerUnitId="unit" />);
  fireEvent.click(screen.getByRole("button", { name: "Yeni Dosya" }));
}

it("offers only active shelves and boxes instead of one select per hierarchy level", async () => {
  open();
  const options = await screen.findAllByRole("radio");
  expect(options.map(option => option.getAttribute("value"))).toEqual(["raf1", "raf2"]);
  // Ara düğümler sunucuda reddedildiği için hiç sunulmaz.
  expect(screen.queryByRole("radio", { name: /Kompakt Dolap 1 ·/ })).toBeNull();
  expect(screen.queryByRole("radio", { name: /Kapatılmış Raf/ })).toBeNull();
});

it("filters locations by search and keeps the chosen one submittable", async () => {
  vi.mocked(createFolderAction).mockResolvedValue({ status: "error", message: "Barkod zaten kayıtlı." });
  open();
  fireEvent.click(await screen.findByRole("radio", { name: /RAF-2 · Raf 2/ }));
  // Arama seçili kaydı listeden düşürse bile form onu göndermeye devam eder.
  fireEvent.change(screen.getByRole("searchbox", { name: "Arşiv konumu ara" }), { target: { value: "RAF-1" } });
  expect((screen.getByRole("radio", { name: /RAF-2 · Raf 2/ }) as HTMLInputElement).checked).toBe(true);

  fireEvent.change(screen.getByLabelText("Dosya Barkodu"), { target: { value: "MBB-934-01-0002" } });
  fireEvent.change(screen.getByLabelText("Dosya Başlığı"), { target: { value: "Mal Alım İşi · 2026" } });
  fireEvent.change(screen.getByRole("combobox", { name: "Dosya Planı Kodu" }), { target: { value: "934.01" } });
  fireEvent.submit(screen.getByRole("button", { name: "Kaydet" }).closest("form")!);

  await waitFor(() => expect(createFolderAction).toHaveBeenCalled());
  const data = vi.mocked(createFolderAction).mock.calls[0][1];
  expect(data.get("locationId")).toBe("raf2");
  expect(data.get("barcode")).toBe("MBB-934-01-0002");
  expect((await screen.findByRole("alert")).textContent).toContain("Barkod zaten kayıtlı.");
});
