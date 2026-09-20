import { cleanup,fireEvent,render,screen,waitFor } from "@testing-library/react";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { DocumentRelations } from "./document-relations";
const api=vi.hoisted(()=>({load:vi.fn(),search:vi.fn(),save:vi.fn(),remove:vi.fn()}));
vi.mock("../api/relation-actions",()=>({getDocumentRelations:api.load,searchRelationDocuments:api.search,saveDocumentRelation:api.save,removeDocumentRelation:api.remove}));
afterEach(cleanup);beforeEach(()=>vi.resetAllMocks());
const item={id:"relation",sourceDocumentId:"doc",targetDocumentId:"target",kind:"Attachment",note:"Ek nüsha",createdBy:"operator",createdAt:"2026-09-17T10:00:00Z",modifiedBy:"operator",modifiedAt:"2026-09-17T10:00:00Z",version:2,canManage:true,title:"Ek belge başlığı"};
it("does not offer mutation controls for read-only or incoming relations",async()=>{
 api.load.mockResolvedValue({items:[{...item,canManage:false}]});render(<DocumentRelations documentId="doc" canManage={false}/>);await screen.findByText("Ek belge başlığı");expect(screen.queryByRole("button",{name:"Düzenle"})).toBeNull();expect(screen.queryByText("Belge ilişkilendir")).toBeNull();
});
it("preserves the relationship when concurrent removal is rejected",async()=>{
 api.load.mockResolvedValue({items:[item]});api.remove.mockResolvedValue({error:"İlişki değişmiş. Listeyi yenileyin."});
 render(<DocumentRelations documentId="doc" canManage/>);await screen.findByText("Ek belge başlığı");fireEvent.click(screen.getByRole("button",{name:"Bağlantıyı kaldır"}));
 fireEvent.change(screen.getByLabelText("Gerekçe"),{target:{value:"Yanlış bağlantı"}});fireEvent.submit(screen.getByLabelText("Gerekçe").closest("form")!);
 await screen.findByRole("alert");expect(api.remove).toHaveBeenCalledWith("doc",item,"Yanlış bağlantı");expect(screen.getByRole("link",{name:"Ek belge başlığı"})).toBeTruthy();
});
it("supports searching beyond the first result page and saves the selected document",async()=>{
 api.load.mockResolvedValue({items:[]});api.search.mockResolvedValueOnce({data:{items:[],page:1,pageSize:20,totalCount:21}}).mockResolvedValue({data:{items:[{id:"last",title:"Son belge"}],page:2,pageSize:20,totalCount:21}});api.save.mockResolvedValue({});
 render(<DocumentRelations documentId="doc" canManage/>);await waitFor(()=>expect(api.load).toHaveBeenCalled());fireEvent.click(screen.getByText("Belge ilişkilendir"));
 fireEvent.submit(screen.getByLabelText("Belge başlığı").closest("form")!);await screen.findByText("1 / 2");fireEvent.click(screen.getByRole("button",{name:"Sonraki"}));await screen.findByText("Son belge");
 fireEvent.change(screen.getByLabelText("İlgili belge"),{target:{value:"last"}});fireEvent.change(screen.getByLabelText("Açıklama"),{target:{value:"Dayanak"}});fireEvent.submit(screen.getByLabelText("Açıklama").closest("form")!);
 await waitFor(()=>expect(api.save).toHaveBeenCalledWith("doc","last","Related","Dayanak",undefined,undefined));
});
