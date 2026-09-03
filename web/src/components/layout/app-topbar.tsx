"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home, Search, ScanLine, Bell, ShieldCheck } from "lucide-react";
import { findNavItem } from "@/components/layout/nav-items";

export function AppTopbar() {
  const pathname = usePathname();
  const current = findNavItem(pathname);
  const isRoot = pathname === "/";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 pl-16 lg:pl-6">
      <div className="flex items-center gap-4 min-w-0">
        <nav aria-label="Sayfa yolu" className="flex items-center gap-1.5 text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm transition-colors"
          >
            <Home className="size-4" aria-hidden />
            <span className="sr-only">Ana Sayfa</span>
          </Link>
          {!isRoot && current ? (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden />
              <span className="font-semibold text-foreground">{current.label}</span>
            </>
          ) : (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden />
              <span className="font-semibold text-foreground">Genel Bakış</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* Global Arama Kısayolu */}
        <Link
          href="/arama"
          className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
        >
          <Search className="size-3.5" />
          <span>Belge, barkod veya konu ara...</span>
          <kbd className="rounded border border-border bg-background px-1.5 text-[10px] font-mono">⌘K</kbd>
        </Link>

        {/* Hızlı Tara Butonu */}
        <Link
          href="/tarama"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
        >
          <ScanLine className="size-3.5" />
          <span>Hızlı Tara</span>
        </Link>
      </div>
    </header>
  );
}
