import { Suspense } from "react";
import { getFolders } from "@/features/physical-archive/api/get-folders";
import { getLocations } from "@/features/physical-archive/api/get-locations";
import { FolderFiltersBar } from "@/features/physical-archive/components/folder-filters";
import { FolderPagination } from "@/features/physical-archive/components/folder-pagination";
import { FolderTable } from "@/features/physical-archive/components/folder-table";
import { NewFolderDialog } from "@/features/physical-archive/components/folder-dialogs";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Dosya İşlemleri · MBB Kurumsal Arşiv" };

const pageSize = 25;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DosyaIslemleriPage({ searchParams }: PageProps) {
  const params = flatten(await searchParams);
  const page = Number.parseInt(params.page ?? "1", 10) || 1;

  const [folders, locations] = await Promise.all([
    getFolders(page, pageSize, {
      barcode: params.barcode,
      title: params.title,
      filePlanCode: params.filePlanCode,
      status: params.status,
      year: params.year,
    }),
    getLocations(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Dosya İşlemleri"
        description="Fiziksel arşiv klasörleri, konumları ve barkodları."
        actions={<NewFolderDialog locations={locations} />}
      />

      <Suspense fallback={<Skeleton className="h-16 w-full" />}>
        <FolderFiltersBar />
      </Suspense>

      <FolderTable folders={folders.items} locations={locations} />

      <FolderPagination
        page={folders.page}
        pageSize={folders.pageSize}
        totalCount={folders.totalCount}
        searchParams={params}
      />
    </div>
  );
}

function flatten(
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    const single = Array.isArray(value) ? value[0] : value;

    if (single) {
      result[key] = single;
    }
  }

  return result;
}
