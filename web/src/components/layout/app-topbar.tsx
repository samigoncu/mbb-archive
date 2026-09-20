"use client";

import Link from "next/link";
import { ProfileMenu } from "./profile-menu";
import type { CurrentUser } from "@/features/access/model/current-user";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ChevronRight,
  Home,
  Search,
  ScanLine,
} from "lucide-react";
import { findNavItem } from "@/components/layout/nav-items";

export function AppTopbar({ user }: { user?: CurrentUser | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = findNavItem(pathname);
  const isRoot = pathname === "/";
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/arama?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/arama");
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 pl-16 lg:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <nav aria-label="Sayfa yolu" className="flex items-center gap-1.5 text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm transition-colors"
          >
            <Home className="size-4" aria-hidden />
            <span className="sr-only">Ana Sayfa</span>
          </Link>
          {!isRoot && (current || pathname === "/profil") ? (
            <>
              <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden />
              <span className="font-semibold text-foreground">{pathname === "/profil" ? "Profilim" : current?.label}</span>
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
        {/* Mobil arama butonu */}
        <Link
          href="/arama"
          aria-label="Arama"
          className="flex md:hidden size-8 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground hover:text-foreground"
        >
          <Search className="size-4" />
        </Link>

        {/* Global Arama Girişi */}
        <form
          onSubmit={handleSearch}
          role="search"
          className="relative hidden md:flex items-center"
        >
          <Search
            className="pointer-events-none absolute left-3 size-3.5 text-muted-foreground"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Belge, barkod veya konu ara..."
            aria-label="Genel arama"
            className="h-8.5 w-64 lg:w-80 rounded-lg border border-border bg-muted/40 pl-8.5 pr-11 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
          />
          <kbd
            onClick={() => inputRef.current?.focus()}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shadow-2xs select-none"
          >
            ⌘K
          </kbd>
        </form>

        {/* Hızlı Tara Butonu */}
        <Link
          href="/tarama"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
        >
          <ScanLine className="size-3.5" />
          <span>Hızlı Tara</span>
        </Link>
        <ProfileMenu user={user} />
      </div>
    </header>
  );
}
