import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NewLocationDialog, RemoveLocationDialog } from "./location-dialogs";
import {
  createLocationAction,
  deleteLocationAction,
  setLocationActiveAction,
} from "../api/location-actions";
import type { LocationOccupancyItem } from "../api/get-occupancy";
import type { LocationTypeItem } from "../model/location";

vi.mock("../api/location-actions", () => ({
  createLocationAction: vi.fn(),
  updateLocationAction: vi.fn(),
  deleteLocationAction: vi.fn(),
  setLocationActiveAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const types: LocationTypeItem[] = [
  { code: "Cabinet", name: "Dolap", level: 6, canStoreFolder: false, allowsCapacity: false, isActive: true, isBuiltIn: true, locationCount: 1 },
  { code: "Shelf", name: "Raf", level: 7, canStoreFolder: true, allowsCapacity: true, isActive: true, isBuiltIn: true, locationCount: 2 },
  { code: "Box", name: "Kutu", level: 8, canStoreFolder: true, allowsCapacity: true, isActive: true, isBuiltIn: true, locationCount: 0 },
];

const shelf: LocationOccupancyItem = {
  id: "raf1", parentId: "dolap", type: "Shelf", code: "RAF-1", name: "Raf 1",
  barcode: "LOC-RAF1", capacity: 10, folderCount: 0, isActive: true,
  typeName: "Raf", level: 7, canStoreFolder: true, allowsCapacity: true,
};

it("offers only the next level in the hierarchy and carries the parent", async () => {
  vi.mocked(createLocationAction).mockResolvedValue({ status: "error", message: "Kod zaten kullanımda." });
  const cabinet: LocationOccupancyItem = { ...shelf, id: "dolap", parentId: null, type: "Cabinet", code: "D1", name: "Dolap 1", capacity: null, typeName: "Dolap", level: 6, canStoreFolder: false, allowsCapacity: false };
  render(<NewLocationDialog parent={cabinet} types={types} />);

  fireEvent.click(screen.getByRole("button", { name: "D1 altına konum ekle" }));
  // Dolaptan (6) daha derin seviyeler sunulur; zincir katı değil.
  expect(await screen.findByRole("heading", { name: "Alt konum ekle" })).toBeTruthy();
  const level = screen.getByRole("combobox", { name: "Yerleşim seviyesi" }) as HTMLSelectElement;
  expect([...level.options].map(option => option.value)).toEqual(["Shelf", "Box"]);

  fireEvent.change(screen.getByLabelText("Konum kodu"), { target: { value: "RAF-9" } });
  fireEvent.change(screen.getByLabelText("Barkod"), { target: { value: "LOC-RAF9" } });
  fireEvent.change(screen.getByLabelText("Görünen ad"), { target: { value: "Raf 9" } });
  fireEvent.submit(screen.getByRole("button", { name: "Kaydet" }).closest("form")!);

  await waitFor(() => expect(createLocationAction).toHaveBeenCalled());
  const data = vi.mocked(createLocationAction).mock.calls[0][1];
  expect(data.get("parentId")).toBe("dolap");
  expect(data.get("typeCode")).toBe("Shelf");
  expect((await screen.findByRole("alert")).textContent).toContain("Kod zaten kullanımda.");
});

it("refuses to delete a location that still holds folders and offers deactivation instead", async () => {
  vi.mocked(setLocationActiveAction).mockResolvedValue({ status: "success", message: "Konum pasife alındı." });
  render(<RemoveLocationDialog location={{ ...shelf, folderCount: 3 }} childCount={0} />);

  fireEvent.click(screen.getByRole("button", { name: "RAF-1 konumunu kaldır" }));
  expect((await screen.findByText(/içinde 3 fiziksel dosya duruyor/)).textContent).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Kalıcı olarak sil" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Pasife al" }));
  await waitFor(() => expect(setLocationActiveAction).toHaveBeenCalledWith("raf1", false));
  expect(deleteLocationAction).not.toHaveBeenCalled();
});

it("blocks deletion while child locations exist", async () => {
  render(<RemoveLocationDialog location={shelf} childCount={2} />);
  fireEvent.click(screen.getByRole("button", { name: "RAF-1 konumunu kaldır" }));
  expect((await screen.findByText(/altında 2 konum var/)).textContent).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Kalıcı olarak sil" })).toBeNull();
});

it("allows deleting an empty location", async () => {
  vi.mocked(deleteLocationAction).mockResolvedValue({ status: "success", message: "Konum silindi." });
  render(<RemoveLocationDialog location={shelf} childCount={0} />);

  fireEvent.click(screen.getByRole("button", { name: "RAF-1 konumunu kaldır" }));
  fireEvent.click(await screen.findByRole("button", { name: "Kalıcı olarak sil" }));
  await waitFor(() => expect(deleteLocationAction).toHaveBeenCalledWith("raf1"));
});
