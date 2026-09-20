import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DocumentPhysicalLocation } from "./document-physical-location";
import { loadPhysicalLocationsAction } from "../api/physical-location-action";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
vi.mock("../api/physical-location-action", () => ({ loadPhysicalLocationsAction: vi.fn() }));
vi.mock("./document-filing-editor", () => ({ DocumentFilingEditor: ({ triggerLabel }: { triggerLabel: string }) => <button>{triggerLabel}</button> }));
vi.mock("@/features/physical-archive/components/folder-dialogs", () => ({ MoveFolderDialog: ({ folderId, currentLocationId }: { folderId: string; currentLocationId: string }) => <button>Taşı {folderId} {currentLocationId}</button> }));
const folder: FolderListItem = { id:"f1",barcode:"F1",title:"İhale klasörü",filePlanCode:"934",locationId:"r1",locationCode:"R1",locationName:"Birinci raf",status:"Available",documentCount:3,createdAt:"2026-01-01",lastMovedAt:null };
beforeEach(() => { vi.mocked(loadPhysicalLocationsAction).mockResolvedValue({ locations: [{id:"r1",parentId:null,type:"Shelf",name:"Birinci raf",code:"R1",barcode:"R1",isActive:true, typeName: "Raf", canStoreFolder: true}] }); });
afterEach(() => {cleanup();vi.resetAllMocks();});
it("exposes separate folder assignment and shelf movement, including the effect on all documents", async () => {
  const {rerender}=render(<DocumentPhysicalLocation documentId="doc" folders={[folder]} cancelled={false} />);
  fireEvent.click(screen.getByRole("button", {name:"Fiziksel yerini değiştir"}));
  await screen.findByRole("button",{name:"Taşı f1 r1"});
  expect(screen.getByRole("button",{name:"Fiziksel klasör bağlantısını değiştir"})).toBeTruthy();
  expect(screen.getByText(/klasördeki tüm belgelerin fiziksel konumunu etkiler/)).toBeTruthy();
  rerender(<DocumentPhysicalLocation documentId="doc" folders={[{...folder,locationId:"r2",locationName:"İkinci raf"}]} cancelled={false} />);
  expect(screen.getByRole("button",{name:"Taşı f1 r2"})).toBeTruthy();
});
it("offers assignment for a document without a physical folder", async () => {
  render(<DocumentPhysicalLocation documentId="doc" folders={[]} cancelled={false} />);
  fireEvent.click(screen.getByRole("button",{name:"Fiziksel yerini değiştir"}));
  await screen.findByRole("button",{name:"Fiziksel klasör bağlantısını değiştir"});
  expect(screen.queryByText("Bağlı klasörün rafını değiştir")).toBeNull();
});
it("shows authorization errors and keeps an unavailable folder from being moved", async () => {
  vi.mocked(loadPhysicalLocationsAction).mockResolvedValue({error:"Fiziksel klasör taşıma yetkiniz yok."});
  render(<DocumentPhysicalLocation documentId="doc" folders={[{...folder,status:"OnLoan"}]} cancelled={false} />);
  fireEvent.click(screen.getByRole("button",{name:"Fiziksel yerini değiştir"}));
  expect((await screen.findByRole("alert")).textContent).toContain("yetkiniz yok");
  expect(screen.getByText("Ödünçte durumundaki klasör taşınamaz.")).toBeTruthy();
  expect(screen.queryByRole("button",{name:/Taşı f1/})).toBeNull();
});
it("requires a cancelled document to be restored first", () => {
  render(<DocumentPhysicalLocation documentId="doc" folders={[folder]} cancelled />);
  expect((screen.getByRole("button",{name:"Fiziksel yerini değiştir"}) as HTMLButtonElement).disabled).toBe(true);
  expect(loadPhysicalLocationsAction).not.toHaveBeenCalled();
});
