import { getFolders } from "@/features/physical-archive/api/get-folders";
import { getLocations } from "@/features/physical-archive/api/get-locations";
import { DossierOperationsView } from "@/features/physical-archive/components/dossier-operations-view";

export const metadata = { title: "Dosya İşlemleri · MBB Kurumsal Arşiv" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DosyaIslemleriPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number.parseInt(String(params.page ?? "1"), 10) || 1;

  const [folders, locations] = await Promise.all([
    getFolders(page, 100, {}),
    getLocations(),
  ]);

  return (
    <DossierOperationsView
      initialFolders={folders.items}
      locations={locations}
    />
  );
}
