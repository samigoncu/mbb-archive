"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Archive, Menu, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-items";
import { canSee, type CurrentUser } from "@/features/access/api/get-current-user";

export function AppSidebar({ user }: { user: CurrentUser | null }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Menüyü kapat" : "Menüyü aç"}
        aria-expanded={isOpen}
        className="fixed left-3 top-3 z-50 inline-flex size-11 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-sidebar-foreground lg:hidden"
      >
        {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Archive className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold tracking-tight text-sidebar-foreground truncate uppercase">
              Malatya B.Ş. Belediyesi
            </span>
            <span className="text-[11px] font-medium text-muted-foreground truncate">
              Kurumsal Arşiv Platformu
            </span>
          </div>
        </div>

        <nav aria-label="Ana menü" className="flex-1 overflow-y-auto p-2">
          <ul className="flex flex-col gap-1">
            {navItems.filter((item) => canSee(user, item.permission)).map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-primary-foreground" : "text-muted-foreground")} aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {user ? (
            <div className="flex items-start gap-2 rounded-lg bg-sidebar-accent/50 p-2">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-sidebar-foreground">
                  {user.subject}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {user.roles.length > 0 ? user.roles.join(", ") : "rol atanmamış"}
                  {user.authenticationMode === "Development" ? " · geliştirme kimliği" : ""}
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-sidebar-accent/50 p-2 text-[11px] text-muted-foreground">
              Kimlik bilgisi alınamadı
            </p>
          )}
        </div>

      </aside>
    </>
  );
}
