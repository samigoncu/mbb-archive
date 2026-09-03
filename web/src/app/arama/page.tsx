import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  searchDocuments,
  searchPageSize,
} from "@/features/search/api/search-documents";
import { SearchBar } from "@/features/search/components/search-bar";
import { SearchFacets } from "@/features/search/components/search-facets";
import { SearchResults } from "@/features/search/components/search-results";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Arama · MBB Kurumsal Arşiv" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AramaPage({ searchParams }: PageProps) {
  const params = flatten(await searchParams);
  const query = params.q ?? "";
  const page = Number.parseInt(params.page ?? "1", 10) || 1;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Arama"
        description="Belge başlığı ve OCR metin katmanında tam metin arama."
      />

      <SearchBar />

      {query ? (
        <SearchOutcome query={query} page={page} params={params} />
      ) : (
        <EmptyPrompt />
      )}
    </div>
  );
}

async function SearchOutcome({
  query,
  page,
  params,
}: {
  query: string;
  page: number;
  params: Record<string, string>;
}) {
  const response = await searchDocuments({
    q: query,
    page,
    mimeType: params.mimeType,
    filePlanCode: params.filePlanCode,
  });

  const lastPage = Math.max(1, Math.ceil(response.total / searchPageSize));

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <SearchFacets
        mimeTypes={response.mimeTypes}
        filePlanCodes={response.filePlanCodes}
        active={params}
      />

      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          <strong className="font-medium text-foreground">{response.total}</strong> sonuç
          bulundu
        </p>

        {response.hits.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-12 text-center">
            <SearchX className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm font-medium">Sonuç bulunamadı</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Farklı bir terim deneyin veya filtreleri kaldırın.
            </p>
          </div>
        ) : (
          <SearchResults hits={response.hits} />
        )}

        {lastPage > 1 ? (
          <Pagination page={page} lastPage={lastPage} params={params} />
        ) : null}
      </div>
    </div>
  );
}

function Pagination({
  page,
  lastPage,
  params,
}: {
  page: number;
  lastPage: number;
  params: Record<string, string>;
}) {
  function hrefFor(target: number): string {
    const next = new URLSearchParams(params);
    next.set("page", String(target));
    return `/arama?${next}`;
  }

  return (
    <nav aria-label="Sayfalama" className="flex items-center justify-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        nativeButton={page <= 1}
        render={page <= 1 ? undefined : <Link href={hrefFor(page - 1)} />}
      >
        Önceki
      </Button>
      <span className="text-sm tabular-nums">
        {page} / {lastPage}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= lastPage}
        nativeButton={page >= lastPage}
        render={page >= lastPage ? undefined : <Link href={hrefFor(page + 1)} />}
      >
        Sonraki
      </Button>
    </nav>
  );
}

function EmptyPrompt() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
      <p className="text-sm font-medium">Aramaya başlayın</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Belge başlıklarında ve taranmış belgelerin OCR metin katmanında arama
        yapabilirsiniz. Eşleşen kelimeler sonuçlarda vurgulanır.
      </p>
    </div>
  );
}

function flatten(
  searchParams: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    const single = Array.isArray(value) ? value[0] : value;

    if (single) {
      result[key] = single;
    }
  }

  return result;
}
