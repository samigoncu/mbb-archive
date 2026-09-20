import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MoveFolderDialog } from "./folder-dialogs";
import { moveFolderAction } from "../api/folder-actions";
vi.mock("../api/folder-actions",()=>({moveFolderAction:vi.fn(),createFolderAction:vi.fn()}));
vi.mock("sonner",()=>({toast:{success:vi.fn()}}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
it("opens the visible shelf action and submits the selected destination through the real form",async()=>{
  vi.mocked(moveFolderAction).mockResolvedValue({status:"error",message:"Klasör ödünçte olduğu için taşınamaz."});
  render(<MoveFolderDialog folderId="folder" folderBarcode="F1" currentLocationId="r1" triggerLabel="Raf / kutu değiştir" locations={[
    {id:"r1",parentId:null,type:"Shelf",name:"Raf 1",code:"R1",barcode:"R1",isActive:true, typeName: "Raf", canStoreFolder: true},
    {id:"r2",parentId:null,type:"Shelf",name:"Raf 2",code:"R2",barcode:"R2",isActive:true, typeName: "Raf", canStoreFolder: true},
  ]} />);
  fireEvent.click(screen.getByRole("button",{name:"F1 · Raf / kutu değiştir"}));
  fireEvent.click(await screen.findByRole("radio",{name:/R2 · Raf 2/}));
  const submit=screen.getByRole("button",{name:"Taşı"});
  expect(submit.getAttribute("type")).toBe("submit");
  fireEvent.submit(submit.closest("form")!);
  await waitFor(()=>expect(moveFolderAction).toHaveBeenCalled());
  const data=vi.mocked(moveFolderAction).mock.calls[0][1];
  expect(data.get("folderId")).toBe("folder");expect(data.get("destinationLocationId")).toBe("r2");
  expect((await screen.findByRole("alert")).textContent).toContain("ödünçte");
});
