import { apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type {
  FilePlanListItem,
  FilePlanTree,
  MetadataSchemaDetail,
  MetadataSchemaListItem,
} from "@/features/classification/model/classification";

export async function getFilePlans(): Promise<FilePlanListItem[]> {
  const result = await apiGet<PagedResult<FilePlanListItem>>(
    "/classification/file-plans?page=1&pageSize=50",
    { cache: "no-store" },
  );
  return (result.items ?? []).filter(plan => plan.isActive);
}

export async function getFilePlanTree(
  id: string,
): Promise<FilePlanTree | null> {
  return await apiGet<FilePlanTree>(`/classification/file-plans/${id}`, {
    cache: "no-store",
  });
}

export async function getMetadataSchemas(): Promise<MetadataSchemaListItem[]> {
  const result = await apiGet<PagedResult<MetadataSchemaListItem>>(
    "/classification/metadata-schemas?page=1&pageSize=50",
    { cache: "no-store" },
  );
  return result.items ?? [];
}

export async function getMetadataSchema(
  id: string,
): Promise<MetadataSchemaDetail | null> {
  return await apiGet<MetadataSchemaDetail>(
    `/classification/metadata-schemas/${id}`,
    { cache: "no-store" },
  );
}

/**
 * İndeksleme formu yalnız yayınlanmış şemalarla çalışır; taslak şema değer
 * kabul etmez. Şema sayısı azdır, ayrıntılar tek seferde toplanır.
 */
export async function getPublishedMetadataSchemas(): Promise<
  MetadataSchemaDetail[]
> {
  const summaries = await getMetadataSchemas();
  const published = summaries.filter((schema) => schema.status === "Published");

  const details = await Promise.all(
    published.map((schema) => getMetadataSchema(schema.id)),
  );

  return details.filter(
    (schema): schema is MetadataSchemaDetail => schema !== null,
  );
}
