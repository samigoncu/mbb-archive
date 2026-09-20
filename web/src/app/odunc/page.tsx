import Link from "next/link";
import { FolderArchive } from "lucide-react";
import { getLoans, countLoans } from "@/features/loans/api/get-loans";
import { getFolders } from "@/features/physical-archive/api/get-folders";
import { searchLoanBorrowers } from "@/features/loans/api/loan-selection-actions";
import { LoanProcessManager } from "@/features/loans/components/loan-process-manager";
import { getBranding } from "@/features/branding/api/branding";
import { defaultBranding } from "@/features/branding/model/branding";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Ödünç ve Zimmet Sistemi | MBB Arşiv" };

export default async function OduncPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const status =
    typeof params.status === "string" && ["Active", "Returned"].includes(params.status)
      ? params.status
      : "";
  const overdueOnly = params.overdueOnly === "true";
  const borrowerSubjectId =
    typeof params.borrowerSubjectId === "string" ? params.borrowerSubjectId.trim() : "";
  const filters = { status, overdueOnly, borrowerSubjectId };

  const [
    loansResult,
    foldersResult,
    borrowersResult,
    activeCount,
    overdueCount,
    returnedCount,
    branding,
  ] = await Promise.all([
    getLoans(page, filters, 50),
    getFolders(1, 25, { status: "Available" }),
    searchLoanBorrowers("", 1),
    countLoans({ status: "Active" }),
    countLoans({ overdueOnly: true }),
    countLoans({ status: "Returned" }),
    getBranding().catch(() => defaultBranding),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Ödünç ve Zimmet"
        description="Fiziksel arşiv klasörlerinin personel zimmetleri, teslim takibi ve iade süreçleri."
        actions={
          <Link
            href="/dosya-islemleri"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Fiziksel dosyalara git
          </Link>
        }
      />

      <LoanProcessManager
        initialLoans={loansResult.items}
        availableFolders={foldersResult.items}
        availableFolderCount={foldersResult.totalCount}
        initialBorrowers={borrowersResult.data?.items ?? []}
        initialBorrowerCount={borrowersResult.data?.totalCount ?? 0}
        totalCount={loansResult.totalCount}
        page={page}
        filters={filters}
        stats={{
          active: activeCount,
          overdue: overdueCount,
          returned: returnedCount,
        }}
        branding={branding}
      />
    </div>
  );
}
