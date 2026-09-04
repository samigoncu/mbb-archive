import { apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type {
  FilePlanListItem,
  FilePlanTree,
  MetadataSchemaListItem,
} from "@/features/classification/model/classification";

export async function getFilePlans(): Promise<FilePlanListItem[]> {
  try {
    const result = await apiGet<PagedResult<FilePlanListItem>>(
      "/classification/file-plans?page=1&pageSize=50",
      { cache: "no-store" },
    );
    return result.items ?? [];
  } catch {
    return [];
  }
}

export async function getFilePlanTree(id: string): Promise<FilePlanTree | null> {
  try {
    return await apiGet<FilePlanTree>(`/classification/file-plans/${id}`, {
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function getMetadataSchemas(): Promise<MetadataSchemaListItem[]> {
  try {
    const result = await apiGet<PagedResult<MetadataSchemaListItem>>(
      "/classification/metadata-schemas?page=1&pageSize=50",
      { cache: "no-store" },
    );
    return result.items ?? [];
  } catch {
    return [];
  }
}
