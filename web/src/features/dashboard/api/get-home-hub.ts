import { getAuditEvents } from "@/features/audit/api/get-audit-events";
import type { AuditEvent } from "@/features/audit/model/audit";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "@/features/dashboard/api/get-dashboard-summary";
import { getRetentionCases } from "@/features/retention/api/get-retention";
import type { RetentionCaseListItem } from "@/features/retention/model/retention";
import { whenPermitted } from "@/lib/api/when-permitted";

export type HomeHubData = {
  summary: DashboardSummary;
  /** Süresi dolmuş ya da planlanmış saklama işlemleri. */
  retentionCases: RetentionCaseListItem[];
  eligibleRetentionCount: number;
  recentActivity: AuditEvent[];
};

export async function getHomeHubData(): Promise<HomeHubData> {
  const [summary, eligible, scheduled, recentActivity] = await Promise.all([
    getDashboardSummary(),
    getRetentionCases(1, "Eligible", 5).catch(() => null),
    getRetentionCases(1, "Scheduled", 5).catch(() => null),
    // Denetim izi ayrı bir izindir; yoksa pano yine açılır.
    whenPermitted(getAuditEvents(12), []),
  ]);

  // Süresi dolanlar önce; ekranda önem sırası bu.
  const retentionCases = [
    ...(eligible?.items ?? []),
    ...(scheduled?.items ?? []),
  ].slice(0, 5);

  return {
    summary,
    retentionCases,
    eligibleRetentionCount: eligible?.totalCount ?? 0,
    recentActivity,
  };
}
