"use server";

import { apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type { LoanDetailsItem, LoanFilters } from "@/features/loans/model/loan";

export async function getLoans(
  page = 1,
  filters: LoanFilters = {},
  pageSize = 50,
): Promise<PagedResult<LoanDetailsItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.overdueOnly) {
    params.set("overdueOnly", "true");
  }

  if (filters.borrowerSubjectId) {
    params.set("borrowerSubjectId", filters.borrowerSubjectId);
  }

  if (filters.dueInDays !== undefined) {
    params.set("dueInDays", String(filters.dueInDays));
  }

  return await apiGet<PagedResult<LoanDetailsItem>>(
    `/physical-archive/loans?${params.toString()}`,
    { cache: "no-store" },
  );
}

/** Özet kartları için yalnızca toplam sayı gerekir; tek kayıt çekmek yeterli. */
export async function countLoans(filters: LoanFilters): Promise<number> {
  const result = await getLoans(1, filters, 1);
  return result.totalCount;
}
