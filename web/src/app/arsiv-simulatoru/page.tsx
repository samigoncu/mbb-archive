import Link from "next/link";
import { getLocationOccupancy } from "@/features/physical-archive/api/get-occupancy";
import { getAllFolders } from "@/features/physical-archive/api/get-folders";
import { ArchiveSimulatorView } from "@/features/physical-archive/components/archive-simulator-view";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Arşiv Simülatörü" };

export default async function ArsivSimulatoruPage() {
  const [locations, folders] = await Promise.all([
    getLocationOccupancy(),
    getAllFolders(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Arşiv Simülatörü"
        description="Kayıtlı konumları ve raflardaki dosyaları görsel olarak inceleyin; seçili dosyanın konumunu yönetin."
        actions={<Link href="/arsiv-yerlesimi" className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">Yerleşim tablosuna dön</Link>}
      />

      <ArchiveSimulatorView locations={locations} folders={folders} />
    </div>
  );
}
