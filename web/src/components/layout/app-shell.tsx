"use client";
import { DiscoveryShell } from "@/features/discovery/discovery-shell";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import type { CurrentUser } from "@/features/access/model/current-user";
import { defaultBranding, type Branding } from "@/features/branding/model/branding";

export function AppShell({
  children,
  user,
  branding = defaultBranding,
}: Readonly<{ children: ReactNode; user?: CurrentUser | null; branding?: Branding }>) {
  const pathname = usePathname();

  // Login ekranında sol menü ve üst menü gösterilmez;
  // tam ekran modern MBB Arşiv giriş arayüzü sunulur.
  if (pathname === "/login") {
    return <main className="min-h-dvh w-full">{children}</main>;
  }

  if (pathname === "/kesfet" || pathname.startsWith("/kesfet/"))
    return <DiscoveryShell user={user ?? null} branding={branding}>{children}</DiscoveryShell>;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <AppSidebar user={user ?? null} branding={branding} />
        <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
          <AppTopbar user={user} />
          <main className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
