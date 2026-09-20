import Link from "next/link";

export function positivePage(value: string | string[] | undefined): number {
  const number = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(number) && number > 0 ? number : 1;
}

export function ExplorerPagination({ page, totalPages, href, label }: {
  page: number;
  totalPages: number;
  href: (page: number) => string;
  label: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-2 py-3 text-xs">
      {page > 1 ? <Link href={href(page - 1)} className="text-primary hover:underline">Önceki</Link> : <span />}
      <span className="text-muted-foreground">{page} / {totalPages}</span>
      {page < totalPages ? <Link href={href(page + 1)} className="text-primary hover:underline">Sonraki</Link> : <span />}
    </nav>
  );
}
