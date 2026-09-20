import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Sonuç sayfaları arasında gezinme; aktif filtreler korunur. */
export function SearchPagination({
  page,
  lastPage,
  params,
}: {
  page: number;
  lastPage: number;
  params: Record<string, string>;
}) {
  if (lastPage <= 1) {
    return null;
  }

  function hrefFor(target: number): string {
    const next = new URLSearchParams(params);
    next.set("page", String(target));
    return `/arama?${next}`;
  }

  const linkClass =
    "inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const disabledClass = "pointer-events-none opacity-40";

  return (
    <nav
      aria-label="Sonuç sayfaları"
      className="flex items-center justify-between gap-2 pt-2"
    >
      <Link
        href={hrefFor(page - 1)}
        aria-disabled={page <= 1}
        className={cn(linkClass, page <= 1 && disabledClass)}
      >
        <ChevronLeft className="size-4" aria-hidden />
        Önceki
      </Link>

      <span className="text-sm text-muted-foreground tabular-nums">
        Sayfa {page} / {lastPage}
      </span>

      <Link
        href={hrefFor(page + 1)}
        aria-disabled={page >= lastPage}
        className={cn(linkClass, page >= lastPage && disabledClass)}
      >
        Sonraki
        <ChevronRight className="size-4" aria-hidden />
      </Link>
    </nav>
  );
}
