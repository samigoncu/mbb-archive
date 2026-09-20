import "server-only";
import { cache } from "react";
import { apiGet } from "@/lib/api/api-client";
import { defaultBranding, type Branding } from "../model/branding";

/**
 * Kurum kimliği her sayfanın düzeninde okunur.
 *
 * <para>
 * İstek başına `cache` ile tekilleştirilir ve etiketli olarak saklanır.
 * Panelden kaydedildiğinde `updateTag` ile anında düşer; panel dışından
 * (doğrudan API ya da başka bir örnek) yapılan değişiklik için kısa bir
 * yeniden doğrulama penceresi bırakılır — marka her sayfanın düzeninde
 * okunduğu için istek başına sunucuya gitmek gereksiz yük olurdu.
 * </para>
 *
 * <para>
 * API'ye ulaşılamazsa hata yükseltilmez: marka bilgisi uygulamanın açılmasını
 * engelleyecek bir veri değil, varsayılana düşülür.
 * </para>
 */
export const getBranding = cache(async (): Promise<Branding> => {
  try {
    return await apiGet<Branding>("/operations/branding", {
      next: { revalidate: 30, tags: ["branding"] },
    } as RequestInit);
  } catch {
    return defaultBranding;
  }
});
