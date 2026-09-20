import type { CurrentUser } from "@/features/access/model/current-user";

export function canOperate(user: CurrentUser | null, permission: string): boolean {
  return Boolean(user?.isAuthenticated && (user.isBootstrapAdministrator || user.permissions.includes(permission)));
}
