/**
 * Etkin kimliğin arayüz tarafındaki gösterimi. Sunucu istemcisinden ayrı bir
 * modülde durur: istemci bileşenleri de bu tipi ve <c>canSee</c> yardımcısını
 * kullanır, oturum jetonuna dokunan kodu paketlerine çekmeden.
 */
export type CurrentUser = {
  subject: string;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  authenticationMode: "Jwt" | "Development";
  isBootstrapAdministrator: boolean;
};

/**
 * Menü görünürlüğü. Bootstrap administrator tüm izinleri karşılar; izin listesi
 * boşsa korumalı menüler gösterilmez.
 *
 * <para>
 * Bu yalnızca görünürlüktür, yetki değildir: her istek API'de yeniden
 * yetkilendirilir (§21).
 * </para>
 */
export function canSee(user: CurrentUser | null, permission?: string): boolean {
  if (!permission) {
    return true;
  }

  if (!user?.isAuthenticated) return false;

  if (user.isBootstrapAdministrator) {
    return true;
  }

  return user.permissions.includes(permission.toLowerCase());
}
