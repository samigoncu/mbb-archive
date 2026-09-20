import { cleanup,fireEvent,render,screen,waitFor,within } from "@testing-library/react";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
import { LoanCheckoutForm } from "./loan-checkout-form";
const api=vi.hoisted(()=>({folders:vi.fn(),borrowers:vi.fn()}));
vi.mock("../api/loan-selection-actions",()=>({searchLoanFolders:api.folders,searchLoanBorrowers:api.borrowers}));
vi.mock("../api/loan-actions",()=>({checkoutLoanAction:vi.fn()}));
vi.mock("@/components/action-form",()=>({ActionForm:({children,label}:{children:React.ReactNode;label:string})=><form aria-label={label}>{children}<button>{label}</button></form>}));
afterEach(cleanup);beforeEach(()=>vi.resetAllMocks());
const folder=(id:string)=>({id,barcode:`BAR-${id}`,title:`Dosya ${id}`,filePlanCode:"100",locationId:"loc",locationCode:"R1",locationName:"Raf",status:"Available" as const,documentCount:1,createdAt:"2026-09-17",lastMovedAt:null});
it("reaches folders beyond the first 100 and posts only a selected directory borrower",async()=>{
 api.folders.mockImplementation((_query:string,page:number)=>Promise.resolve({data:{items:[folder(String(page*25))],page,pageSize:25,totalCount:125}}));
 api.borrowers.mockResolvedValue({data:{items:[{subjectId:"person",unitName:"Birim"}],page:1,pageSize:25,totalCount:1}});
 render(<LoanCheckoutForm initialFolders={[folder("1")]} folderCount={125}/>);fireEvent.click(screen.getByText("Yeni ödünç / zimmet kaydı"));
 const navigation=screen.getByRole("navigation",{name:"Dosya seçim sayfaları"});
 for(let page=2;page<=5;page++){fireEvent.click(within(navigation).getByRole("button",{name:"Sonraki"}));await screen.findByText(`125 dosya · Sayfa ${page}`);await waitFor(()=>expect(screen.queryByRole("status")).toBeNull());}
 expect(api.folders).toHaveBeenLastCalledWith("",5);fireEvent.click(screen.getByRole("button",{name:"BAR-125 · Dosya 125"}));
 expect(screen.queryByRole("form",{name:"Ödünç kaydını oluştur"})).toBeNull();fireEvent.click(screen.getByRole("button",{name:"Personel ara"}));await screen.findByRole("button",{name:"person · Birim"});await waitFor(()=>expect(screen.queryByRole("status")).toBeNull());fireEvent.click(screen.getByRole("button",{name:"person · Birim"}));
 const form=screen.getByRole("form",{name:"Ödünç kaydını oluştur"});expect(form.querySelector<HTMLInputElement>('[name="folderId"]')?.value).toBe("125");expect(form.querySelector<HTMLInputElement>('[name="borrowerSubjectId"]')?.value).toBe("person");
});
it("does not turn directory failure into an empty-personnel success state",async()=>{
 api.borrowers.mockResolvedValue({error:"Personel servisine erişilemiyor."});render(<LoanCheckoutForm initialFolders={[]} folderCount={0}/>);fireEvent.click(screen.getByText("Yeni ödünç / zimmet kaydı"));fireEvent.click(screen.getByRole("button",{name:"2. Personel Seçimi"}));fireEvent.click(screen.getByRole("button",{name:"Personel ara"}));
 expect(await screen.findByRole("alert")).toBeTruthy();expect(screen.queryByRole("form",{name:"Ödünç kaydını oluştur"})).toBeNull();expect(screen.queryByText(/Etkin birime kayıtlı personel bulunamadı/)).toBeNull();
});
