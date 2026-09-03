import Link from "next/link";
import { FileText, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HighlightedText } from "@/features/search/components/highlighted-text";
import { mimeTypeLabel, type SearchHit } from "@/features/search/model/search";

export function SearchResults({ hits }: { hits: SearchHit[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {hits.map((hit) => (
        <li key={hit.documentId}>
          <article className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-base font-semibold">
                <Link
                  href={`/documents/${hit.documentId}`}
                  className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {hit.title}
                </Link>
              </h3>
              {hit.mimeType ? (
                <Badge variant="outline">{mimeTypeLabel(hit.mimeType)}</Badge>
              ) : null}
            </div>

            {hit.fragments.length > 0 ? (
              <div className="mt-2 flex flex-col gap-1">
                {hit.fragments.map((fragment, index) => (
                  <p key={index} className="text-sm leading-relaxed text-muted-foreground">
                    <HighlightedText fragment={fragment} />
                  </p>
                ))}
              </div>
            ) : null}

            {hit.pages.length > 0 ? (
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Layers className="size-3.5" aria-hidden />
                  Eşleşen sayfalar
                </p>
                {hit.pages.map((page) => (
                  <div key={page.pageNumber} className="flex gap-2 text-sm">
                    <span className="inline-flex h-6 shrink-0 items-center rounded bg-muted px-1.5 text-xs font-medium tabular-nums">
                      s. {page.pageNumber}
                    </span>
                    <div className="min-w-0 flex-1 text-muted-foreground">
                      {page.fragments.map((fragment, index) => (
                        <p key={index} className="leading-relaxed">
                          <HighlightedText fragment={fragment} />
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="size-3.5" aria-hidden />
              <span className="font-mono">{hit.documentId.slice(0, 8)}</span>
              <span aria-hidden>·</span>
              <span>skor {hit.score.toFixed(2)}</span>
            </p>
          </article>
        </li>
      ))}
    </ol>
  );
}
