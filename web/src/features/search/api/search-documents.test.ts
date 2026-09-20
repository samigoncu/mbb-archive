import { expect,it,vi } from "vitest";
import { apiGet } from "@/lib/api/api-client";
import { searchDocuments } from "./search-documents";
vi.mock("@/lib/api/api-client",()=>({apiGet:vi.fn().mockResolvedValue({hits:[],total:0,mimeTypes:[],filePlanCodes:[]})}));
it("forwards the inclusive end date, server sort and requested page size",async()=>{
 await searchDocuments({q:"imar",page:2,pageSize:12,to:"2026-09-06",dateField:"ingestedAt",sort:"title_asc"});
 const query=new URL(String(vi.mocked(apiGet).mock.calls[0][0]),"https://archive").searchParams;
 expect(query.get("to")).toBe("2026-09-06");expect(query.get("pageSize")).toBe("12");expect(query.get("sort")).toBe("title_asc");
});
