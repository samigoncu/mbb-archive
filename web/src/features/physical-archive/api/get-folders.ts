import { apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type {
  FolderFilters,
  FolderListItem,
} from "@/features/physical-archive/model/folder";

export async function getFolders(
  page: number = 1,
  pageSize: number = 50,
  filters: FolderFilters = {},
): Promise<PagedResult<FolderListItem>> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });

    for (const [key, value] of Object.entries(filters)) {
      if (value) {
        params.set(key, value);
      }
    }

    return await apiGet<PagedResult<FolderListItem>>(
      `/physical-archive/folders?${params.toString()}`,
      { cache: "no-store" },
    );
  } catch {
    return {
      items: [],
      totalCount: 0,
      page,
      pageSize,
    };
  }
}
