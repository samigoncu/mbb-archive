import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ArchiveSimulatorView } from "./archive-simulator-view";
import { folder } from "@/features/scanning/model/scan-context.fixtures";
vi.mock("../api/folder-actions", () => ({ moveFolderAction: vi.fn() }));
afterEach(cleanup);
it("requires a destination and explicit save after selecting a folder", () => {
  render(<ArchiveSimulatorView locations={[
    { id:"cabinet", parentId:null, type:"Cabinet", code:"D1", name:"Dolap 1", barcode:"D1", capacity:null, folderCount:0,isActive:true, typeName:"Dolap", level:6, canStoreFolder:false, allowsCapacity:false},
    { id:"shelf", parentId:"cabinet", type:"Shelf", code:"R1", name:"Raf 1", barcode:"R1", capacity:10, folderCount:1,isActive:true, typeName:"Raf", level:7, canStoreFolder:true, allowsCapacity:true},
    { id:"shelf2", parentId:"cabinet", type:"Shelf", code:"R2", name:"Raf 2", barcode:"R2", capacity:10, folderCount:0,isActive:true, typeName:"Raf", level:7, canStoreFolder:true, allowsCapacity:true},
  ]} folders={[{...folder(), title:"İhale dosyası"}]} />);
  fireEvent.click(screen.getByRole("button", { name:/İhale dosyası/ }));
  const save = screen.getByRole("button", { name:"Konum değişikliğini kaydet" }) as HTMLButtonElement;
  expect(save.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("Hedef raf / kutu"), { target:{ value:"shelf2" } });
  expect(save.disabled).toBe(false);
  expect(screen.getByRole("link", { name:"Dosya detayını aç" }).getAttribute("href")).toContain("/dosya-islemleri/");
});
