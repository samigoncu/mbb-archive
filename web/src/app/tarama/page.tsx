import { getFolders } from "@/features/physical-archive/api/get-folders";
import { getFilePlans } from "@/features/classification/api/get-classification";
import { getDocuments } from "@/features/documents/api/get-documents";
import { ScanIndexingStudio } from "@/features/scanning/components/scan-indexing-studio";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Tarama ve İndeksleme · MBB Kurumsal Arşiv" };

export default async function TaramaPage() {
  const [foldersResult, filePlans, recentDocsResult] = await Promise.all([
    getFolders(1, 100, {}),
    getFilePlans(),
    getDocuments(1, 10),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <ScanIndexingStudio
        initialFolders={foldersResult.items}
        initialFilePlans={filePlans}
        initialRecentDocs={recentDocsResult.items}
      />
    </div>
  );
}
