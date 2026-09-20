import Link from "next/link";
import { ArrowUpRight, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HighlightedText } from "@/features/search/components/highlighted-text";
import { MapPin } from "lucide-react";
import { geoRelationTypeLabels } from "@/features/geo/model/geo";
import { mimeTypeLabel, type SearchHit } from "@/features/search/model/search";
import { formatSearchDate } from "../model/search-dates";

export function SearchResults({ hits }: { hits: SearchHit[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {hits.map((hit) => (
        <li key={hit.documentId}>
          <article className="rounded-xl border border-border bg-card p-5 shadow-flat">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="min-w-0 break-words text-base font-semibold leading-7">
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

            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Kayıt: {formatSearchDate(hit.createdAt)}</span>
              <span>Yüklenme: {formatSearchDate(hit.ingestedAt)}</span>
            </p>
            {hit.fragments.length > 0 ? (
              <div className="mt-4 flex flex-col gap-2 rounded-lg bg-muted/30 p-3">
                {hit.fragments.map((fragment, index) => (
                  <p
                    key={index}
                    className="text-sm leading-relaxed text-muted-foreground"
                  >
                    <HighlightedText fragment={fragment} />
                  </p>
                ))}
              </div>
            ) : null}

            {hit.geoMatches.length > 0 ? (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                <MapPin
                  className="size-3.5 text-muted-foreground"
                  aria-hidden
                />
                <span className="text-muted-foreground">Harita ilişkisi:</span>
                {hit.geoMatches.map((match) => (
                  <span
                    key={`${match.name}-${match.relationType}`}
                    className="rounded border border-border px-1.5 py-0.5"
                  >
                    {match.name}
                    <span className="ml-1 text-muted-foreground">
                      {geoRelationTypeLabels[match.relationType] ??
                        match.relationType}
                    </span>
                  </span>
                ))}
              </p>
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

            <div className="mt-4 flex justify-end border-t border-border pt-3"><Link href={`/documents/${hit.documentId}`} className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-primary hover:underline">Belgeyi aç<ArrowUpRight className="size-4" aria-hidden /></Link></div>
          </article>
        </li>
      ))}
    </ol>
  );
}
