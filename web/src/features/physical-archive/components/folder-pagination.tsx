import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function FolderPagination({
  page,
  pageSize,
  totalCount,
  searchParams,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  searchParams: Record<string, string>;
}) {
  const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  function hrefFor(target: number): string {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(target));
    return `/dosya-islemleri?${params}`;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {totalCount} kayıttan {from}–{to} arası
      </p>

      <nav aria-label="Sayfalama" className="flex items-center gap-2">
        <PageLink href={hrefFor(page - 1)} disabled={page <= 1} label="Önceki sayfa">
          <ChevronLeft className="size-4" aria-hidden />
        </PageLink>
        <span className="text-sm tabular-nums">
          {page} / {lastPage}
        </span>
        <PageLink href={hrefFor(page + 1)} disabled={page >= lastPage} label="Sonraki sayfa">
          <ChevronRight className="size-4" aria-hidden />
        </PageLink>
      </nav>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "inline-flex size-9 items-center justify-center rounded-md border border-input",
    disabled
      ? "pointer-events-none opacity-40"
      : "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  );

  if (disabled) {
    return (
      <span className={className} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={className} aria-label={label}>
      {children}
    </Link>
  );
}
