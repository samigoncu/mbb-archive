import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WorkItemList } from "./work-item-list";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("./task-assignment-form",()=>({TaskAssignmentForm:()=>null}));
vi.mock("../api/complete-task-action",()=>({completeWorkflowTaskAction:vi.fn()}));
afterEach(cleanup);
it("shows assignment ownership and does not offer another person's completion",()=>{
  render(<WorkItemList subject="me" canAssign items={[
    {id:"1",instanceId:"a",definitionId:"d",definitionName:"Kontrol",documentId:"doc",nodeName:"Belgeyi kontrol et",permission:"workflow.task.complete",status:"Open",createdAt:"2026-09-09",dueAt:null,isOverdue:false,assigneeSubjectId:"other"},
  ]}/>);
  expect(screen.getByText("other")).toBeTruthy();
  expect(screen.queryByRole("button",{name:"Tamamla"})).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Bana atanan"}));
  expect(screen.getByRole("status").textContent).toContain("görev yok");
});
