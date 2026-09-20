import { beforeEach, expect, it, vi } from "vitest";
import { moveFolderAction } from "./folder-actions";
import { apiPost } from "@/lib/api/api-client";
import { revalidatePath } from "next/cache";
vi.mock("@/lib/api/api-client",()=>({ apiPost:vi.fn(),ApiError:class extends Error{} }));
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
beforeEach(()=>vi.resetAllMocks());
function request() { const data=new FormData();data.set("folderId","folder");data.set("destinationLocationId","shelf");return data; }
it("moves the selected folder and refreshes all affected document detail pages",async()=>{
  vi.mocked(apiPost).mockResolvedValue(undefined);
  expect((await moveFolderAction({status:"idle"},request())).status).toBe("success");
  expect(apiPost).toHaveBeenCalledWith("/physical-archive/folders/folder/move",{destinationLocationId:"shelf"});
  expect(revalidatePath).toHaveBeenCalledWith("/documents","layout");
});
it("does not report success or invalidate locations after a rejected move",async()=>{
  vi.mocked(apiPost).mockRejectedValue(new Error("conflict"));
  expect((await moveFolderAction({status:"idle"},request())).status).toBe("error");
  expect(revalidatePath).not.toHaveBeenCalled();
});
