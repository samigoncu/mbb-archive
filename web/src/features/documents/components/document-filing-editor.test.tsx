import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentFilingEditor } from "./document-filing-editor";
import { changeDocumentFilingAction, loadDocumentFilingAction } from "../api/document-filing-actions";
vi.mock("../api/document-filing-actions", () => ({ changeDocumentFilingAction: vi.fn(), loadDocumentFilingAction: vi.fn() }));
const fixture: import("../model/document-filing").FilingEditorData = { locations:[
  {id:"cabinet",parentId:null,type:"Cabinet",code:"D1",name:"Dolap 1",barcode:"D1",isActive:true, typeName: "Dolap", canStoreFolder: false},
  {id:"shelf",parentId:"cabinet",type:"Shelf",code:"R1",name:"Raf 1",barcode:"R1",isActive:true, typeName: "Raf", canStoreFolder: true},
  {id:"other",parentId:null,type:"Cabinet",code:"D2",name:"Dolap 2",barcode:"D2",isActive:true, typeName: "Dolap", canStoreFolder: false},
  {id:"other-shelf",parentId:"other",type:"Shelf",code:"R2",name:"Raf 2",barcode:"R2",isActive:true, typeName: "Raf", canStoreFolder: true}], current: { ownerUnitId:"unit",version:7,dossierId:"old",filePlanCode:"010",
  classification:{planId:"plan",itemId:"one",code:"010",title:"Genel"}, folders:[{id:"f1",barcode:"F1",title:"Eski klasör",filePlanCode:"010"}] },
  choices:{ ownerUnitId:"unit",recentDocuments:[],classifications:[
    {key:"plan:one",planId:"plan",itemId:"one",code:"010",title:"Genel",planName:"SDP",version:"1"},
    {key:"plan:two",planId:"plan",itemId:"two",code:"020",title:"Sözleşmeler",planName:"SDP",version:"1"}],
    dossiers:[{ownerUnitId:"unit",ownerUnitName:"Bilgi İşlem",filePlanVersion:"1",filePlanCode:"010",filePlanTitle:"Genel",documentCount:1,id:"old",filePlanId:"plan",filePlanItemId:"one",title:"Eski",year:2026}, {ownerUnitId:"unit",ownerUnitName:"Bilgi İşlem",filePlanVersion:"1",filePlanCode:"020",filePlanTitle:"Sözleşmeler",documentCount:0,id:"new",filePlanId:"plan",filePlanItemId:"two",title:"Yeni",year:2026}],
    folders:[{locationId:"shelf",locationCode:"R1",locationName:"Raf",status:"Available",documentCount:1,createdAt:"2026-01-01",lastMovedAt:null,id:"f1",barcode:"F1",title:"Eski klasör",filePlanCode:"010",digitalDossierId:"old"}, {locationId:"shelf",locationCode:"R1",locationName:"Raf",status:"Available",documentCount:0,createdAt:"2026-01-01",lastMovedAt:null,id:"f2",barcode:"F2",title:"Yeni klasör",filePlanCode:"020",digitalDossierId:"new"}] }
};
beforeEach(() => { vi.mocked(loadDocumentFilingAction).mockResolvedValue({data:fixture}); });
afterEach(() => { cleanup(); vi.resetAllMocks(); });
describe("Document filing editor", () => {
  it("loads existing assignments, clears incompatible choices and submits the concurrency snapshot", async () => {
    vi.mocked(changeDocumentFilingAction).mockResolvedValue({success:true});
    render(<DocumentFilingEditor documentId="doc" />);
    fireEvent.click(screen.getByRole("button",{name:"Dosyalamayı değiştir"}));
    const plan = await screen.findByRole("combobox",{name:"Standart Dosya Planı (SDP)"});
    expect((plan as HTMLSelectElement).value).toBe("plan:one");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
    fireEvent.change(plan,{target:{value:"plan:two"}});
    expect((screen.getByRole("combobox",{name:"Dijital dosya"}) as HTMLSelectElement).value).toBe("");
    expect(screen.queryByRole("checkbox")).toBeNull();
    fireEvent.change(screen.getByRole("combobox",{name:"Dijital dosya"}),{target:{value:"new"}});
    expect(screen.queryByRole("checkbox",{name:"F2 · Yeni klasör"})).toBeNull();
    fireEvent.click(screen.getByRole("radio",{name:/R1 · Raf 1/}));
    fireEvent.click(screen.getByRole("checkbox",{name:"F2 · Yeni klasör"}));
    fireEvent.change(screen.getByRole("textbox",{name:"Değişiklik gerekçesi"}),{target:{value:"Yanlış dosya seçilmiş"}});
    fireEvent.click(screen.getByRole("button",{name:"Dosyalamayı kaydet"}));
    await waitFor(()=>expect(changeDocumentFilingAction).toHaveBeenCalledWith("doc",{ expectedVersion:7,dossierId:"new",filePlanId:"plan",filePlanItemId:"two",expectedFolderIds:["f1"],folderIds:["f2"],reason:"Yanlış dosya seçilmiş" }));
    await screen.findByText("SDP, dijital dosya ve fiziksel klasör bağlantıları kaydedildi.");
  });
  it("switches the offered folders with the location and preserves selected links", async () => {
    render(<DocumentFilingEditor documentId="doc" inline physicalOnly />);
    fireEvent.click(await screen.findByRole("radio",{name:/R1 · Raf 1/}));
    expect((screen.getByRole("radio",{name:/R1 · Raf 1/}) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("radio",{name:/R2 · Raf 2/}));
    expect((screen.getByRole("radio",{name:/R1 · Raf 1/}) as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByRole("combobox",{name:"Dijital dosya"})).toBeNull();
    // Başka konuma geçmek mevcut bağlantıyı düşürmez.
    expect((screen.getByRole("checkbox",{name:"F1 · Eski klasör"}) as HTMLInputElement).checked).toBe(true);
  });
  it("keeps an API conflict visible and does not report success", async () => {
    vi.mocked(changeDocumentFilingAction).mockResolvedValue({error:"Kayıt değişmiş; yenileyin."});
    render(<DocumentFilingEditor documentId="doc" />); fireEvent.click(screen.getByRole("button",{name:"Dosyalamayı değiştir"}));
    fireEvent.change(await screen.findByRole("textbox",{name:"Değişiklik gerekçesi"}),{target:{value:"Düzeltme"}});
    fireEvent.click(screen.getByRole("button",{name:"Dosyalamayı kaydet"}));
    expect((await screen.findByRole("alert")).textContent).toContain("Kayıt değişmiş");
    expect(screen.queryByText("SDP, dijital dosya ve fiziksel klasör bağlantıları kaydedildi.")).toBeNull();
  });
  it("shows a scoped authorization failure without an editable form", async () => {
    vi.mocked(loadDocumentFilingAction).mockResolvedValue({error:"Dosyalama yetkiniz yok."});
    render(<DocumentFilingEditor documentId="doc" />);fireEvent.click(screen.getByRole("button",{name:"Dosyalamayı değiştir"}));
    await screen.findByRole("alert"); expect(screen.queryByRole("combobox")).toBeNull();
  });
});
