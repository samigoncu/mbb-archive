import { expect, it } from "vitest";
import { locationPath } from "./location-path";
import type { LocationListItem } from "./location";
const cabinet: LocationListItem = { id: "cabinet", parentId: null, name: "Dolap 2", code: "D2", type: "Cabinet", barcode: "D2", isActive: true, typeName: "Dolap", canStoreFolder: false};
const shelf: LocationListItem = { ...cabinet, id: "shelf", parentId: "cabinet", name: "Raf 3", type: "Shelf" };
it("fiziksel konumu üstten alta gerçek ilişkilerle gösterir", () => {
  expect(locationPath([shelf, cabinet], "shelf")).toBe("Dolap 2 → Raf 3");
});
it("erişilemeyen üst konumu uydurmaz ve döngüde takılmaz", () => {
  expect(locationPath([shelf], "shelf")).toBe("Raf 3");
  expect(locationPath([], "missing", "Kayıtlı raf")).toBe("Kayıtlı raf");
  expect(locationPath([{ ...cabinet, parentId: "shelf" }, shelf], "shelf")).toBe("Dolap 2 → Raf 3");
});
