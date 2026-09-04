import { getDashboardData } from "@/features/dashboard/api/get-dashboard";
import { getLocationOccupancy } from "@/features/physical-archive/api/get-occupancy";
import { getFolders } from "@/features/physical-archive/api/get-folders";
import { getDocuments } from "@/features/documents/api/get-documents";
import { getLoans } from "@/features/loans/api/get-loans";
import { ExecutiveDashboardView } from "@/features/dashboard/components/executive-dashboard-view";

export const metadata = { title: "Ana Sayfa · MBB Kurumsal Arşiv" };

export default async function HomePage() {
  const [dashboardData, locations, foldersResult, documentsResult, loansResult] =
    await Promise.all([
      getDashboardData().catch(() => null),
      getLocationOccupancy(),
      getFolders(1, 100, {}),
      getDocuments(1, 100),
      getLoans(1, {}, 100),
    ]);

  const totalDocumentCount = dashboardData?.documentCount ?? documentsResult.totalCount;

  // Bugün yüklenen evrak sayısı (Gerçek veriden)
  const todayStr = new Date().toISOString().split("T")[0];
  const todayUploadCount = documentsResult.items.filter((d) =>
    d.createdAt.startsWith(todayStr)
  ).length;

  return (
    <ExecutiveDashboardView
      totalDocumentCount={totalDocumentCount}
      todayUploadCount={todayUploadCount}
      locations={locations}
      folders={foldersResult.items}
      documents={documentsResult.items}
      loans={loansResult.items}
    />
  );
}
