import { getLocationOccupancy } from "@/features/physical-archive/api/get-occupancy";
import { getFolders } from "@/features/physical-archive/api/get-folders";
import { ArchiveSimulatorView } from "@/features/physical-archive/components/archive-simulator-view";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Arşiv Simülatörü · MBB Kurumsal Arşiv" };

export default async function ArsivSimulatoruPage() {
  const [locations, foldersResult] = await Promise.all([
    getLocationOccupancy(),
    getFolders(1, 100, {}),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Arşiv Simülatörü & Mekansal Yerleşim"
        description="Fiziksel kompakt raylı dolaplar, dikey raf kutu organizasyonu, CBS ada/parsel harita eşleştirmesi ve HFC-227ea yangın sensör telemetrisi."
      />

      <ArchiveSimulatorView
        locations={locations}
        folders={foldersResult.items}
      />
    </div>
  );
}
