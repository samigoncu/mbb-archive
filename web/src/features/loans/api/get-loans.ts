import { apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type {
  LoanDetailsItem,
  LoanFilters,
} from "@/features/loans/model/loan";

export const loanPageSize = 25;

export async function getLoans(
  page: number,
  filters: LoanFilters,
  pageSize = loanPageSize,
): Promise<PagedResult<LoanDetailsItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.borrowerSubjectId) {
    params.set("borrowerSubjectId", filters.borrowerSubjectId);
  }

  if (filters.overdueOnly) {
    params.set("overdueOnly", "true");
  }

  if (filters.dueInDays !== undefined) {
    params.set("dueInDays", String(filters.dueInDays));
  }

  return apiGet<PagedResult<LoanDetailsItem>>(
    `/physical-archive/loans?${params.toString()}`,
    { cache: "no-store" },
  );
}

/** Özet kartları için yalnızca toplam sayı gerekir; tek kayıt çekmek yeterli. */
export async function countLoans(filters: LoanFilters): Promise<number> {
  const result = await getLoans(1, filters, 1);
  return result.totalCount;
}
