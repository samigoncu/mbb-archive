import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CancelVersionPanel } from "./cancel-version-panel";
import { cancelVersionAction } from "../api/cancel-version-action";
const { router } = vi.hoisted(() => ({ router: { refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../api/cancel-version-action", () => ({ cancelVersionAction: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
beforeEach(() => { vi.mocked(cancelVersionAction).mockResolvedValue({success:true}); });
const versions = [1,2,3].map(n=>({versionNumber:n, mimeType:"application/pdf",sizeBytes:10,sha256Hash:"hash",createdBy:"test",createdAt:"2026-09-07",reason:"Nüsha"}));
const props = {documentId:"doc",versions,version:versions[2],currentVersion:3,expectedVersion:7,canCancel:true,archived:false};
function open() { fireEvent.click(screen.getByRole("button",{name:/sürümünü iptal et/})); }
it("requires explicit replacement for current version and sends reason plus concurrency snapshot",async()=>{
  render(<CancelVersionPanel {...props}/>);open();
  fireEvent.change(screen.getByLabelText("İptal gerekçesi"),{target:{value:"Yanlış nüsha"}});
  expect((screen.getByRole("button",{name:"Gerekçeyle iptal et"}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByRole("combobox"),{target:{value:"1"}});
  fireEvent.click(screen.getByRole("button",{name:"Gerekçeyle iptal et"}));
  await waitFor(()=>expect(cancelVersionAction).toHaveBeenCalledWith("doc",3,expect.objectContaining({expectedVersion:7,reason:"Yanlış nüsha",replacementVersionNumber:1,requestId:expect.any(String)})));
  expect(router.refresh).toHaveBeenCalledOnce();
});
it("excludes cancelled versions from replacement choices and blocks the only valid version",()=>{
  render(<CancelVersionPanel {...props} versions={versions.map(v=>v.versionNumber===3?v:{...v,cancelledAt:"2026-09-07"})}/>);open();
  expect(screen.getByRole("alert").textContent).toContain("tek geçerli sürüm");
  expect(screen.queryByRole("button",{name:"Gerekçeyle iptal et"})).toBeNull();
});
it("keeps server errors visible and retries with the same request identity",async()=>{
  vi.mocked(cancelVersionAction).mockResolvedValue({error:"Bağlantı kesildi"});
  render(<CancelVersionPanel {...props} version={versions[0]}/>);open();
  expect(screen.queryByRole("combobox")).toBeNull();
  fireEvent.change(screen.getByLabelText("İptal gerekçesi"),{target:{value:"Mükerrer"}});
  fireEvent.click(screen.getByRole("button",{name:"Gerekçeyle iptal et"}));await screen.findByRole("alert");
  const first=vi.mocked(cancelVersionAction).mock.calls[0][2];
  fireEvent.click(await screen.findByRole("button",{name:"Gerekçeyle iptal et"}));
  await waitFor(()=>expect(cancelVersionAction).toHaveBeenCalledTimes(2));
  expect(vi.mocked(cancelVersionAction).mock.calls[1][2]).toEqual(first);expect(router.refresh).not.toHaveBeenCalled();
});
it("shows cancellation provenance while retaining the historical record",()=>{
  render(<CancelVersionPanel {...props} version={{...versions[0],cancelledAt:"2026-09-07T10:00:00Z",cancelledBy:"Ayşe",cancellationReason:"Eksik sayfa"}}/>);
  expect(screen.getByText("v1 — İptal edildi")).toBeTruthy();expect(screen.getByText("Eksik sayfa")).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
it.each([{canCancel:false,archived:false},{canCancel:true,archived:true}])("shows why version cancellation is disabled: %j",blocked=>{
  render(<CancelVersionPanel {...props} {...blocked}/>);expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);expect(screen.getByText(blocked.archived ? "Arşivlenmiş belgenin sürümü iptal edilemez." : "Sürüm iptal yetkiniz yok.")).toBeTruthy();
});
