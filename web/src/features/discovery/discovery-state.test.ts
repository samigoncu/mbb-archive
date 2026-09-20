import { expect,it } from "vitest";
import { discoveryState,discoveryHref,discoveryBack } from "./discovery-state";
it("sends title, MIME, dates, sort and page to the server without client filtering",()=>{
 const state=discoveryState({q:"İhale",field:"title",mimeType:"application/pdf",from:"2026-01-01",to:"2026-02-01",sort:"newest",page:"2"},["keyword","title"]);
 expect(state.error).toBeUndefined();expect(state.criteria).toMatchObject({q:"",page:2,pageSize:12,sort:"newest",from:"2026-01-01",to:"2026-02-01",conditions:[{field:"title",operator:"contains",value:"İhale"}]});
});
it("rejects unknown metadata, invalid dates and excessive pages",()=>{
 for(const params of [{field:"metadata:private.value"},{from:"2026-02-31"},{page:"90000"},{page:"2x"},{sort:"body"}])expect(discoveryState(params,["keyword","title"]).error).toBeTruthy();
});
it("preserves search criteria through list, pagination and detail navigation",()=>{
 const href=discoveryHref({q:"İmar & karar",mimeType:"application/pdf",sort:"title_asc"},{page:"2",view:"list"});
 expect(new URL(href,"https://archive").searchParams.get("q")).toBe("İmar & karar");expect(discoveryBack(href)).toBe(href);
 expect(discoveryBack("//evil.example")).toBe("/kesfet");expect(discoveryBack("https://evil.example")).toBe("/kesfet");
});
