import { cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { ReprocessButton } from "./reprocess-button";
const api=vi.hoisted(()=>({run:vi.fn(),refresh:vi.fn()}));
vi.mock("./reprocess-action",()=>({reprocessDocument:api.run}));vi.mock("next/navigation",()=>({useRouter:()=>({refresh:api.refresh})}));
afterEach(cleanup);beforeEach(()=>vi.resetAllMocks());
it("submits the selected job and refreshes only when accepted",async()=>{
 api.run.mockResolvedValue({});render(<ReprocessButton documentId="doc" jobId="job"/>);fireEvent.click(screen.getByRole("button"));
 await screen.findByText("Yeniden işleme kuyruğa alındı");expect(api.run).toHaveBeenCalledWith("doc","job");expect(api.refresh).toHaveBeenCalledTimes(1);expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
});
it("shows stale version errors without reporting acceptance and allows retry",async()=>{
 api.run.mockResolvedValue({error:"Belgenin güncel sürümü değişti."});render(<ReprocessButton documentId="doc" jobId="old"/>);fireEvent.click(screen.getByRole("button"));
 expect(await screen.findByRole("alert")).toBeTruthy();expect(api.refresh).not.toHaveBeenCalled();await waitFor(()=>expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(false));
});
