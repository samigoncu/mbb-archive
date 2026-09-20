import { cleanup,render,screen } from "@testing-library/react";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { DocumentVersionText } from "./document-version-text";
const api=vi.hoisted(()=>({load:vi.fn()}));vi.mock("../api/version-text-action",()=>({getDocumentVersionText:api.load}));
afterEach(cleanup);beforeEach(()=>vi.resetAllMocks());
it("reads and labels the exact requested historical text",async()=>{
 api.load.mockResolvedValue({data:{documentId:"doc",hasText:true,text:"v1 OCR metni",characterCount:12,isTruncated:false}});
 render(<DocumentVersionText documentId="doc" version={1}/>);await screen.findByText("v1 OCR metni");expect(api.load).toHaveBeenCalledWith("doc",1);expect(screen.getByText("v1 OCR / metin çıktısı")).toBeTruthy();
});
it("does not turn a storage failure into absence of OCR",async()=>{
 api.load.mockResolvedValue({error:"Kayıtlı metin depolamada bulunamadı."});render(<DocumentVersionText documentId="doc" version={1}/>);
 await screen.findByRole("alert");expect(screen.queryByText(/kaydedilmiş OCR veya metin çıktısı yok/)).toBeNull();
});
