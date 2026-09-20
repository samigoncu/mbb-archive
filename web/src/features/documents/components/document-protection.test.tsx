import { cleanup,render,screen } from "@testing-library/react";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { DocumentProtection } from "./document-protection";
const api=vi.hoisted(()=>({load:vi.fn()}));vi.mock("../api/protection-action",()=>({getDocumentProtection:api.load}));
afterEach(cleanup);beforeEach(()=>vi.resetAllMocks());
const status={versionId:"id",versionNumber:1,storageVersionId:"s3-v1",checkedAt:"2026-09-17T10:00:00Z",retainUntil:"2099-09-17T10:00:00Z",legalHold:true,error:null};
it("never claims WORM for an unchecked version",async()=>{
 api.load.mockResolvedValue({items:[{...status,checkedAt:null,retainUntil:null,legalHold:false}]});render(<DocumentProtection documentId="doc" version={1}/>);
 await screen.findByText("Henüz doğrulanmadı");expect(screen.queryByText("Depo kilidi doğrulandı")).toBeNull();expect(screen.getByText(/yerel dosya depolaması/)).toBeTruthy();
});
it("shows provider failure and explicitly identifies old verified values",async()=>{
 api.load.mockResolvedValue({items:[{...status,error:"Provider unavailable"}]});render(<DocumentProtection documentId="doc" version={1}/>);
 await screen.findByText("Koruma doğrulanamadı");expect(screen.getByText(/önceki başarılı doğrulamadan/)).toBeTruthy();expect(screen.queryByText("Depo kilidi doğrulandı")).toBeNull();
});
it("uses the selected version protection instead of the newest version",async()=>{
 api.load.mockResolvedValue({items:[{...status,versionNumber:2}, {...status,checkedAt:null,storageVersionId:null,retainUntil:null,legalHold:false}]});render(<DocumentProtection documentId="doc" version={1}/>);
 await screen.findByText("Henüz doğrulanmadı");expect(screen.queryByText(/Depo sürümü: s3-v1/)).toBeNull();
});
