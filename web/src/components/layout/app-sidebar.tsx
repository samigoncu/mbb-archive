"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { findNavItem, navGroups } from "@/components/layout/nav-items";
import { canSee, type CurrentUser } from "@/features/access/model/current-user";
import { useSidebar } from "@/components/layout/sidebar-context";
import { brandingAssetUrl, defaultBranding, type Branding } from "@/features/branding/model/branding";

export function AppSidebar({ user, branding = defaultBranding }: { user: CurrentUser | null; branding?: Branding }) {
  const pathname = usePathname();
  const logo = brandingAssetUrl(branding.logo);
  const activeHref = findNavItem(pathname)?.href;
  const { isCollapsed, toggleCollapsed, isMobileOpen, setIsMobileOpen, toggleMobile } =
    useSidebar();

  return (
    <>
      <button
        type="button"
        onClick={toggleMobile}
        aria-label={isMobileOpen ? "Menüyü kapat" : "Menüyü aç"}
        aria-expanded={isMobileOpen}
        className="fixed left-3 top-3 z-50 inline-flex size-11 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-sidebar-foreground lg:hidden shadow-sm"
      >
        {isMobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {isMobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-200 ease-in-out lg:static lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed ? "w-64 lg:w-[70px]" : "w-64",
        )}
      >
        {/* Logo ve Üst Başlık */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-sidebar-border",
            isCollapsed ? "justify-center px-2" : "justify-between px-3.5",
          )}
        >
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden lg:inline-flex size-10 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent transition-colors cursor-pointer shadow-2xs"
              title="Menüyü Genişlet (Ctrl+B)"
              aria-label="Menüyü Genişlet"
            >
              <PanelLeftOpen className="size-5" />
            </button>
          ) : (
            <>
              <Link href="/" className="flex items-center gap-2 overflow-hidden min-w-0 shrink">
                {logo ? (
                  <img
                    src={logo}
                    alt={`${branding.institutionName} — ${branding.siteTitle}`}
                    width={300}
                    height={77}
                    className="h-10 w-auto object-contain shrink-0"
                  />
                ) : (
                  <span className="truncate text-sm font-semibold">{branding.siteTitle}</span>
                )}
              </Link>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="hidden lg:inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors cursor-pointer"
                title="Menüyü Daralt (Ctrl+B)"
                aria-label="Menüyü Daralt"
              >
                <PanelLeftClose className="size-4.5" />
              </button>
            </>
          )}
        </div>

        {/* Menü Kalemleri */}
        <nav aria-label="Ana menü" className="flex-1 overflow-y-auto p-2">
          <div className="flex flex-col gap-3">
            {navGroups.map((group, groupIndex) => {
              const visible = group.items.filter((item) => canSee(user, item.permission));

              if (visible.length === 0) {
                return null;
              }

              return (
                <div key={group.title ?? `group-${groupIndex}`} className="flex flex-col gap-1">
                  {group.title ? (
                    isCollapsed ? (
                      <div
                        className="my-1.5 h-px bg-sidebar-border/60 mx-2"
                        title={group.title}
                      />
                    ) : (
                      <h2 className="px-3 pt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {group.title}
                      </h2>
                    )
                  ) : null}

                  <ul className="flex flex-col gap-0.5">
                    {visible.map((item) => {
                      const Icon = item.icon;

                      if (item.status === "planned") {
                        return (
                          <li key={item.href}>
                            <span
                              title={isCollapsed ? `${item.label} (Yakında)` : item.plannedNote}
                              aria-disabled
                              className={cn(
                                "flex min-h-9 cursor-not-allowed items-center rounded-lg text-sm font-medium text-sidebar-foreground/35",
                                isCollapsed
                                  ? "justify-center px-0 size-10 mx-auto"
                                  : "gap-3 px-3",
                              )}
                            >
                              <Icon className="size-4.5 shrink-0" aria-hidden />
                              {!isCollapsed && (
                                <>
                                  <span className="truncate">{item.label}</span>
                                  <span className="ml-auto shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                                    yakında
                                  </span>
                                </>
                              )}
                            </span>
                          </li>
                        );
                      }

                      const isActive = item.href === activeHref;

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setIsMobileOpen(false)}
                            aria-current={isActive ? "page" : undefined}
                            title={isCollapsed ? item.label : undefined}
                            className={cn(
                              "group flex min-h-9 items-center rounded-lg text-sm font-medium transition-all",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                              isCollapsed
                                ? "justify-center px-0 size-10 mx-auto"
                                : "gap-3 px-3",
                              isActive
                                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-4.5 shrink-0",
                                isActive ? "text-primary-foreground" : "text-muted-foreground",
                              )}
                              aria-hidden
                            />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>

      </aside>
    </>
  );
}
