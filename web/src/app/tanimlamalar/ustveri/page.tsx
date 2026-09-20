import { apiGet } from "@/lib/api/api-client";
import { PageHeader } from "@/components/ui/page";
import { MetadataSchemasWorkspace } from "@/features/classification/components/metadata-schemas-workspace";
import type {
  MetadataSchemaListItem,
  MetadataSchemaDetail,
} from "@/features/classification/model/classification";
import type { PagedResult } from "@/features/documents/model/document";

export const metadata = { title: "Evrak Üstverisi" };

const pageSize = 50;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const schemas = await apiGet<PagedResult<MetadataSchemaListItem>>(
    `/classification/metadata-schemas?page=${page}&pageSize=${pageSize}`,
    { cache: "no-store" },
  );

  const schema = params.id
    ? await apiGet<MetadataSchemaDetail>(
        `/classification/metadata-schemas/${encodeURIComponent(params.id)}`,
        { cache: "no-store" },
      ).catch(() => null)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Evrak Üstverisi"
        description="Belgelerde toplanacak ek alanları şema olarak tanımlayın. Taslak şemaları düzenleyebilir veya silebilir; yayımlanan şemalar için yeni sürüm açabilirsiniz."
      />

      <MetadataSchemasWorkspace
        schemasResult={schemas}
        selectedSchema={schema}
        currentPage={page}
        pageSize={pageSize}
      />
    </div>
  );
}
