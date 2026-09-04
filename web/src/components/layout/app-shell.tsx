"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { AppFooter } from "@/components/layout/app-footer";
import type { CurrentUser } from "@/features/access/api/get-current-user";

export function AppShell({
  children,
  user,
}: Readonly<{ children: ReactNode; user?: CurrentUser | null }>) {
  const pathname = usePathname();

  // Login ekranında sol menü, üst menü ve genel alt bilgi gösterilmez;
  // tam ekran modern MBB Arşiv giriş arayüzü sunulur.
  if (pathname === "/login") {
    return <main className="h-screen w-screen overflow-hidden">{children}</main>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <AppSidebar user={user ?? null} />
      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
        <AppTopbar />
        <main className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
        <AppFooter />
      </div>
    </div>
  );
}
