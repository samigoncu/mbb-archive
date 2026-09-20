import {cleanup,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,expect,it,vi} from "vitest";
import {EditCollectionDialog} from "./collection-board";
import {updateCollectionAction} from "../api/collection-actions";
vi.mock("../api/collection-actions",()=>({updateCollectionAction:vi.fn(),createCollectionAction:vi.fn(),deleteCollectionAction:vi.fn()}));
vi.mock("sonner",()=>({toast:{success:vi.fn(),error:vi.fn()}}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
it("saves changes by clicking Kaydet and keeps API errors visible",async()=>{
 vi.mocked(updateCollectionAction).mockResolvedValue({status:"error",message:"Koleksiyonu değiştirme yetkiniz yok."});
 render(<EditCollectionDialog collection={{id:"collection",name:"Eski ad",description:null,ownerSubject:"test",isShared:false,itemCount:0,createdAt:"2026-09-07"}}/>);
 fireEvent.click(screen.getByRole("button",{name:"Düzenle / Paylaşım"}));
 fireEvent.change(await screen.findByRole("textbox",{name:"Ad"}),{target:{value:"Yeni ad"}});
 fireEvent.click(screen.getByRole("button",{name:"Kaydet"}));
 await waitFor(()=>expect(updateCollectionAction).toHaveBeenCalled());
 const form=vi.mocked(updateCollectionAction).mock.calls[0][1];expect(form.get("name")).toBe("Yeni ad");expect(form.get("collectionId")).toBe("collection");
 expect((await screen.findByRole("alert")).textContent).toContain("yetkiniz yok");
});
