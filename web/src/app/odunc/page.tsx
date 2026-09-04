import { getLoans } from "@/features/loans/api/get-loans";
import { getFolders } from "@/features/physical-archive/api/get-folders";
import { LoanProcessManager } from "@/features/loans/components/loan-process-manager";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Ödünç Sistemi · MBB Kurumsal Arşiv" };

export default async function OduncPage() {
  const [loansResult, foldersResult] = await Promise.all([
    getLoans(1, {}, 100),
    getFolders(1, 100, { status: "Available" }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Ödünç & Zimmet Yönetimi"
        description="Fiziksel arşiv dosyalarının birimlere ödünç verilmesi, resmi teslim-tesellüm tutanağı ve kontrollü iade süreçleri."
      />

      <LoanProcessManager
        initialLoans={loansResult.items}
        availableFolders={foldersResult.items}
      />
    </div>
  );
}
