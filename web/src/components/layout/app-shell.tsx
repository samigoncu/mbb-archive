import type { ReactNode } from "react";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

export async function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
