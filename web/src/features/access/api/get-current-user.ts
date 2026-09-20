import { apiGet } from "@/lib/api/api-client";
import type { CurrentUser } from "@/features/access/model/current-user";

export { canSee } from "@/features/access/model/current-user";
export type { CurrentUser } from "@/features/access/model/current-user";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await apiGet<CurrentUser>("/access/me", { cache: "no-store" });
  } catch {
    // Kimlik alınamazsa menü kısıtlanmaz; yetki kararı zaten her istekte
    // backend policy'sinde yeniden verilir.
    return null;
  }
}
