import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DocumentCancellationPanel } from "./document-cancellation-panel";
import { changeDocumentCancellation } from "../api/document-cancellation-action";
vi.mock("../api/document-cancellation-action",()=>({changeDocumentCancellation:vi.fn()}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
afterEach(cleanup);beforeEach(()=>{vi.resetAllMocks();vi.mocked(changeDocumentCancellation).mockResolvedValue({success:true});});
const details={id:"doc",title:"Yanlış belge",status:"Draft",createdAt:"2026-09-07",archivedAt:null,versionCount:1,concurrencyVersion:5};
it("cancels the whole single-version document with a reason and concurrency snapshot",async()=>{
 render(<DocumentCancellationPanel details={details} canCancel />);
 fireEvent.click(screen.getByRole("button",{name:"Yanlış yüklemeyi iptal et"}));
 expect((screen.getByRole("button",{name:"Belgeyi gerekçeyle iptal et"}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.change(screen.getByLabelText("Belge iptal gerekçesi"),{target:{value:"Yanlış dosya"}});
 fireEvent.click(screen.getByRole("button",{name:"Belgeyi gerekçeyle iptal et"}));
 await waitFor(()=>expect(changeDocumentCancellation).toHaveBeenCalledWith("doc",true,expect.objectContaining({expectedVersion:5,reason:"Yanlış dosya",requestId:expect.any(String)})));
});
it("restores a cancelled document and shows its cancellation reason",async()=>{
 render(<DocumentCancellationPanel details={{...details,status:"Cancelled",cancellationReason:"Yanlış dosya",cancelledBy:"Ayşe"}} canCancel />);
 expect(screen.getByText("Yanlış dosya")).toBeTruthy();
 fireEvent.click(screen.getByRole("button",{name:"Belge iptalini geri al"}));
 fireEvent.change(screen.getByLabelText("Geri alma gerekçesi"),{target:{value:"Kontrol edildi"}});
 fireEvent.click(screen.getByRole("button",{name:"Gerekçeyle geri al"}));
 await waitFor(()=>expect(changeDocumentCancellation).toHaveBeenCalledWith("doc",false,expect.objectContaining({reason:"Kontrol edildi"})));
});
it.each([{status:"Archived",canCancel:true,message:"Arşivlenmiş belge bu işlemle iptal edilemez."},{status:"Draft",canCancel:false,message:"Belge iptal ve geri alma yetkiniz yok."}])("shows why the action is unavailable: $status",x=>{
 render(<DocumentCancellationPanel details={{...details,status:x.status}} canCancel={x.canCancel} />);
 expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);expect(screen.getByText(x.message)).toBeTruthy();
});
it("preserves request identity after an uncertain response",async()=>{
 vi.mocked(changeDocumentCancellation).mockResolvedValue({error:"Sonuç alınamadı"});
 render(<DocumentCancellationPanel details={details} canCancel />);
 fireEvent.click(screen.getByRole("button",{name:"Yanlış yüklemeyi iptal et"}));
 fireEvent.change(screen.getByLabelText("Belge iptal gerekçesi"),{target:{value:"Yanlış"}});
 fireEvent.click(screen.getByRole("button",{name:"Belgeyi gerekçeyle iptal et"}));await screen.findByRole("alert");
 fireEvent.click(await screen.findByRole("button",{name:"Belgeyi gerekçeyle iptal et"}));
 await waitFor(()=>expect(changeDocumentCancellation).toHaveBeenCalledTimes(2));
 expect(vi.mocked(changeDocumentCancellation).mock.calls[0]).toEqual(vi.mocked(changeDocumentCancellation).mock.calls[1]);
});
