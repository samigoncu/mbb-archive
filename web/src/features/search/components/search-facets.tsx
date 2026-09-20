import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  mimeTypeLabel,
  type FacetBucket,
} from "@/features/search/model/search";

type FacetGroup = {
  title: string;
  param: "mimeType" | "filePlanCode";
  buckets: FacetBucket[];
  format?: (key: string) => string;
};

export function SearchFacets({
  mimeTypes,
  filePlanCodes,
  active,
}: {
  mimeTypes: FacetBucket[];
  filePlanCodes: FacetBucket[];
  active: Record<string, string>;
}) {
  const groups: FacetGroup[] = [
    { title: "Belge Türü", param: "mimeType", buckets: mimeTypes, format: mimeTypeLabel },
    { title: "Dosya Planı", param: "filePlanCode", buckets: filePlanCodes },
  ];

  const hasAnyBucket = groups.some((group) => group.buckets.length > 0);

  if (!hasAnyBucket) {
    return (
      <aside className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Sonuçları daraltın</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Bu sonuç kümesi için filtre bulunmuyor. Belgeler sınıflandırıldıkça ve
          dosya yüklendikçe belge türü ve dosya planı filtreleri burada listelenir.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex flex-wrap gap-4 rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Sonuçları daraltın</h2>

      {groups.map((group) =>
        group.buckets.length === 0 ? null : (
          <div key={group.param} className="flex flex-col gap-1.5">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group.title}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {group.buckets.map((bucket) => {
                const isActive = active[group.param] === bucket.key;
                const params = new URLSearchParams(active);

                if (isActive) {
                  params.delete(group.param);
                } else {
                  params.set(group.param, bucket.key);
                }

                params.delete("page");

                return (
                  <li key={bucket.key}>
                    <Link
                      href={`/arama?${params}`}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "flex min-h-9 items-center justify-between gap-2 rounded-lg border border-border px-3 text-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-accent font-medium text-accent-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        {isActive ? <X className="size-3.5 shrink-0" aria-hidden /> : null}
                        <span className="truncate">
                          {group.format ? group.format(bucket.key) : bucket.key}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {bucket.count}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ),
      )}
    </aside>
  );
}
