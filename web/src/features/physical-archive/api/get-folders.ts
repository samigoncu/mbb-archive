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
}

/** Özet kartları için yalnızca toplam sayı gerekir; tek kayıt çekmek yeterli. */
export async function countFolders(
  filters: FolderFilters = {},
): Promise<number> {
  const result = await getFolders(1, 1, filters);
  return result.totalCount;
}

/**
 * Yerleşim simülatörü tüm dosyaların raf dağılımına ihtiyaç duyar; API sayfa
 * başına en fazla 100 kayıt döndüğü için sayfalar sırayla toplanır. `maxItems`
 * limitsiz liste çekmeyi engeller, aşıldığında kalan kayıtlar raf sayacından
 * okunur.
 */
export async function getAllFolders(
  filters: FolderFilters = {},
  maxItems = 1000,
): Promise<FolderListItem[]> {
  const pageSize = 100;
  const items: FolderListItem[] = [];

  for (let page = 1; items.length < maxItems; page += 1) {
    const result = await getFolders(page, pageSize, filters);
    items.push(...result.items);

    if (result.items.length < pageSize || items.length >= result.totalCount) {
      break;
    }
  }

  return items.slice(0, maxItems);
}
