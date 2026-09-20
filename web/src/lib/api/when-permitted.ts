import { ApiError } from "@/lib/api/api-error";

/**
 * Yetki dışı kalan veri kaynağını boş değere düşürür.
 *
 * <para>
 * Birim kapsamı ve rol izinleri devreye girdiğinde her kullanıcı her modülü
 * göremez; pano gibi çok kaynaklı ekranlar tek bir 403 yüzünden komple hata
 * sayfasına düşmemeli, kişinin görebildiği kadarını göstermeli.
 * </para>
 *
 * <para>
 * Yalnızca 403 yutulur. 500 ya da bağlantı hatası olduğu gibi yükselir:
 * gerçek bir kesinti "veri yok" gibi görünmemeli (§33).
 * </para>
 */
export async function whenPermitted<T>(
  work: Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return fallback;
    }

    throw error;
  }
}
