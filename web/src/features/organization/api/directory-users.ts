import { apiGet, apiPut, ApiError } from "@/lib/api/api-client";
import type { DirectoryUser } from "@/features/organization/model/directory-user";

export type DirectoryUserPage = {
  users: DirectoryUser[];
  /** Sınır aşıldı: liste eksik, arama ile daraltılmalı. */
  hasMore: boolean;
  /** Künye okunamadı; ekran ham kimlikle çalışır. */
  unavailable: boolean;
  /** Yetki eksikliği gibi beklenen bir durum mu, yoksa arıza mı. */
  error?: string;
};

/**
 * Bilinen kullanıcı künyeleri.
 *
 * <para>
 * Yetkisi olmayan kullanıcıda boş liste döner — künye yalnız görünen adı
 * zenginleştirir, listenin çalışması ona bağlı değildir. Ama <em>arıza</em>
 * sessizce yutulmaz: 403 dışındaki hatalarda çağıran uyarı gösterebilsin
 * diye durum bildirilir. Aksi hâlde API çökse bile ekran, künyesi olmayan
 * bir kurum gibi görünür ve kimse fark etmezdi.
 * </para>
 */
export async function listDirectoryUsers(
  search?: string,
  limit = 500,
): Promise<DirectoryUserPage> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (search?.trim()) query.set("arama", search.trim());

  try {
    const page = await apiGet<{ items: DirectoryUser[]; hasMore: boolean }>(
      `/organization/directory/users?${query}`,
      { cache: "no-store" },
    );
    return { users: page.items, hasMore: page.hasMore, unavailable: false };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;

    // 401/403: kullanıcının künye yönetimi yetkisi yok; beklenen durum.
    const expected = error.status === 401 || error.status === 403;
    return {
      users: [],
      hasMore: false,
      unavailable: true,
      error: expected ? undefined : "Kullanıcı künyeleri okunamadı; adlar yerine kimlikler gösteriliyor.",
    };
  }
}

export async function saveDirectoryUser(
  subjectId: string,
  body: { displayName: string; email: string | null; title: string | null; isActive: boolean },
): Promise<DirectoryUser> {
  return apiPut<typeof body, DirectoryUser>(
    `/organization/directory/users/${encodeURIComponent(subjectId)}`,
    body,
  );
}
