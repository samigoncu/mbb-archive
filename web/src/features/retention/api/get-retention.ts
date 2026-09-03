import { apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type {
  RetentionCaseListItem,
  RetentionRuleListItem,
} from "@/features/retention/model/retention";

export const retentionPageSize = 25;

export async function getRetentionCases(
  page: number,
  status?: string,
  pageSize = retentionPageSize,
): Promise<PagedResult<RetentionCaseListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  if (status) {
    params.set("status", status);
  }

  return apiGet<PagedResult<RetentionCaseListItem>>(
    `/retention/cases?${params.toString()}`,
    { cache: "no-store" },
  );
}

export async function countRetentionCases(status?: string): Promise<number> {
  const result = await getRetentionCases(1, status, 1);
  return result.totalCount;
}

export async function getRetentionRules(): Promise<RetentionRuleListItem[]> {
  return apiGet<RetentionRuleListItem[]>("/retention/rules", {
    cache: "no-store",
  });
}
