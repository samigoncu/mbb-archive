import Link from "next/link";
import { cn } from "@/lib/utils";
import { countLoans, getLoans, loanPageSize } from "@/features/loans/api/get-loans";
import { LoanSummary } from "@/features/loans/components/loan-summary";
import { LoanTable } from "@/features/loans/components/loan-table";
import type { LoanFilters } from "@/features/loans/model/loan";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Ödünç Sistemi · MBB Kurumsal Arşiv" };

const views = [
  { key: "all", label: "Tümü" },
  { key: "active", label: "Zimmette" },
  { key: "overdue", label: "Süresi Geçen" },
  { key: "returned", label: "İade Alınan" },
] as const;

type ViewKey = (typeof views)[number]["key"];

const viewFilters: Record<ViewKey, LoanFilters> = {
  all: {},
  active: { status: "Active" },
  overdue: { overdueOnly: true },
  returned: { status: "Returned" },
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OduncPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const view = toView(single(params.view));
  const page = Number.parseInt(single(params.page) ?? "1", 10) || 1;
  const borrower = single(params.borrowerSubjectId);

  const [loans, active, overdue, dueSoon, returned] = await Promise.all([
    getLoans(page, { ...viewFilters[view], borrowerSubjectId: borrower }),
    countLoans({ status: "Active" }),
    countLoans({ overdueOnly: true }),
    countLoans({ dueInDays: 7 }),
    countLoans({ status: "Returned" }),
  ]);

  const lastPage = Math.max(1, Math.ceil(loans.totalCount / loanPageSize));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Ödünç Sistemi"
        description="Birimlere zimmetlenen fiziksel dosyalar, iade süreleri ve gecikme takibi."
      />

      <LoanSummary
        active={active}
        overdue={overdue}
        dueSoon={dueSoon}
        returned={returned}
      />

      <nav aria-label="Görünüm" className="flex flex-wrap gap-1">
        {views.map((item) => (
          <Link
            key={item.key}
            href={item.key === "all" ? "/odunc" : `/odunc?view=${item.key}`}
            aria-current={view === item.key ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              view === item.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <LoanTable loans={loans.items} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {loans.totalCount} kayıt
        </p>
        {lastPage > 1 ? (
          <nav aria-label="Sayfalama" className="flex items-center gap-3 text-sm">
            {page > 1 ? (
              <Link href={pageHref(view, page - 1)} className="hover:underline">
                Önceki
              </Link>
            ) : null}
            <span className="tabular-nums">
              {page} / {lastPage}
            </span>
            {page < lastPage ? (
              <Link href={pageHref(view, page + 1)} className="hover:underline">
                Sonraki
              </Link>
            ) : null}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function pageHref(view: ViewKey, page: number): string {
  const params = new URLSearchParams({ page: String(page) });

  if (view !== "all") {
    params.set("view", view);
  }

  return `/odunc?${params}`;
}

function toView(value: string | undefined): ViewKey {
  return views.some((item) => item.key === value) ? (value as ViewKey) : "all";
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
