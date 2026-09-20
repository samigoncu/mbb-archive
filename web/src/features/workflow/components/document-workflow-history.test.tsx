import { cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { DocumentWorkflowHistory } from "./document-workflow-history";
const api=vi.hoisted(()=>({load:vi.fn()}));
vi.mock("../api/document-history",()=>({getDocumentWorkflowHistory:api.load}));
afterEach(cleanup);beforeEach(()=>vi.resetAllMocks());
const item={id:"task",instanceId:"flow",definitionName:"Belge kontrolü",nodeName:"Müdür onayı",instanceStatus:"Completed",status:"Completed",createdAt:"2026-09-17T09:00:00Z",dueAt:null,assigneeSubjectId:"reviewer",assignedBy:"manager",assignedAt:"2026-09-17T09:00:00Z",completedBy:"reviewer",completedAt:"2026-09-17T10:00:00Z",outcome:"approved",escalationLevel:0};
it("shows completed actor and outcome and requests subsequent history pages",async()=>{
  api.load.mockResolvedValue({data:{items:[item],page:1,pageSize:25,totalCount:26}});
  render(<DocumentWorkflowHistory documentId="doc"/>);
  await screen.findByText("Müdür onayı");expect(screen.getByText(/approved/)).toBeTruthy();expect(screen.getByText("Tamamlandı")).toBeTruthy();
  await waitFor(()=>expect((screen.getByRole("button",{name:"Sonraki"}) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole("button",{name:"Sonraki"}));await waitFor(()=>expect(api.load).toHaveBeenLastCalledWith("doc",2));
});
it("keeps permission errors distinct from no history and permits retry",async()=>{
  api.load.mockResolvedValueOnce({error:"İş akışı geçmişini görüntüleme yetkiniz yok."}).mockResolvedValue({data:{items:[],page:1,pageSize:25,totalCount:0}});
  render(<DocumentWorkflowHistory documentId="doc"/>);expect(await screen.findByRole("alert")).toBeTruthy();expect(screen.queryByText(/kayıtlı görev yok/)).toBeNull();
  await waitFor(()=>expect((screen.getByRole("button",{name:"Yenile"}) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole("button",{name:"Yenile"}));await screen.findByText(/kayıtlı görev yok/);
});
