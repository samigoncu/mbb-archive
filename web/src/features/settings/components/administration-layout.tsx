import type { ReactNode } from "react";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { AdministrationNavigation } from "./administration-navigation";
export async function AdministrationLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return <div className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-6"><AdministrationNavigation user={user} /><div className="min-w-0">{children}</div></div>;
}
