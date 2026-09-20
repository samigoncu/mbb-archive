import {beforeEach,expect,it,vi} from "vitest";
import {revalidatePath} from "next/cache";
import {apiDelete} from "@/lib/api/api-client";
import {removeDocumentFromCollectionAction} from "./collection-actions";
vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
vi.mock("@/lib/api/api-client",()=>({apiDelete:vi.fn(),apiPut:vi.fn(),apiPost:vi.fn(),ApiError:class extends Error{}}));
beforeEach(()=>{vi.resetAllMocks();});
const data=()=>{const form=new FormData();form.set("collectionId","c");form.set("documentId","d");return form;};
it("removal refreshes both collection detail and document membership screens",async()=>{
 vi.mocked(apiDelete).mockResolvedValue(undefined);expect((await removeDocumentFromCollectionAction({status:"idle"},data())).status).toBe("success");
 expect(apiDelete).toHaveBeenCalledWith("/collections/c/documents/d");expect(revalidatePath).toHaveBeenCalledWith("/koleksiyonlar","layout");expect(revalidatePath).toHaveBeenCalledWith("/documents","layout");
});
it("failed removal preserves the current view and reports failure",async()=>{
 vi.mocked(apiDelete).mockRejectedValue(new Error("failed"));expect((await removeDocumentFromCollectionAction({status:"idle"},data())).status).toBe("error");expect(revalidatePath).not.toHaveBeenCalled();
});
