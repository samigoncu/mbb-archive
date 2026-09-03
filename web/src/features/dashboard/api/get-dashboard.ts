import { apiGet } from "@/lib/api/api-client";
import type {
  DocumentListItem,
  PagedResult,
} from "@/features/documents/model/document";
import type { OperationsOverview } from "@/features/operations/types";

export type DashboardData = {
  overview: OperationsOverview;
  documentCount: number;
};

/**
 * Pano, modüllerin kendi katkı verdiği operasyonel anlık görüntüden beslenir;
 * bounded context'lere doğrudan sorgu atılmaz. Ölçüm gelmezse kart "—" gösterir,
 * uydurma değer üretilmez.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const [overview, documents] = await Promise.all([
    apiGet<OperationsOverview>("/operations/overview", { cache: "no-store" }),
    apiGet<PagedResult<DocumentListItem>>("/documents?page=1&pageSize=1", {
      cache: "no-store",
    }),
  ]);

  return { overview, documentCount: documents.totalCount };
}

export function measurement(
  overview: OperationsOverview,
  component: string,
  name: string,
): number | null {
  const snapshot = overview.components.find((item) => item.component === component);
  const found = snapshot?.measurements.find((item) => item.name === name);

  return found ? found.value : null;
}
