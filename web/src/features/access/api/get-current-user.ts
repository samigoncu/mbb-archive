import { apiGet } from "@/lib/api/api-client";

export type CurrentUser = {
  subject: string;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  authenticationMode: "Jwt" | "Development";
  isBootstrapAdministrator: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return await apiGet<CurrentUser>("/access/me", { cache: "no-store" });
  } catch {
    // Kimlik alınamazsa menü kısıtlanmaz; yetki kararı zaten her istekte
    // backend policy'sinde yeniden verilir.
    return null;
  }
}

/**
 * Menü görünürlüğü. Bootstrap administrator tüm izinleri karşılar; izin listesi
 * boşsa (henüz rol tanımlanmamışsa) kısıtlama uygulanmaz.
 */
export function canSee(user: CurrentUser | null, permission?: string): boolean {
  if (!permission || !user) {
    return true;
  }

  if (user.isBootstrapAdministrator || user.permissions.length === 0) {
    return true;
  }

  return user.permissions.includes(permission.toLowerCase());
}
