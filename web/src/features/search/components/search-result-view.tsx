"use client";

import { useState } from "react";
import Link from "next/link";
import { Columns3, LayoutList, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExportCsvButton } from "@/components/export-csv-button";
import { mimeTypeLabel, type SearchHit } from "../model/search";
import { SearchResults } from "./search-results";
import { formatSearchDate } from "../model/search-dates";

const columns = [
  { key: "title", label: "Belge adı", value: (hit: SearchHit) => hit.title },
  {
    key: "ingestedAt",
    label: "Yüklenme tarihi",
    value: (hit: SearchHit) => formatSearchDate(hit.ingestedAt),
  },
  {
    key: "createdAt",
    label: "Kayıt tarihi",
    value: (hit: SearchHit) => formatSearchDate(hit.createdAt),
  },
  {
    key: "mimeType",
    label: "Belge türü",
    value: (hit: SearchHit) =>
      hit.mimeType ? mimeTypeLabel(hit.mimeType) : "—",
  },
  {
    key: "pages",
    label: "Eşleşen sayfalar",
    value: (hit: SearchHit) =>
      hit.pages.map((page) => page.pageNumber).join(", ") || "—",
  },
  {
    key: "id",
    label: "Belge kimliği",
    value: (hit: SearchHit) => hit.documentId,
  },
] as const;

export function SearchResultView({
  hits,
  total,
}: {
  hits: SearchHit[];
  total: number;
}) {
  const [view, setView] = useState<"list" | "table">("list");
  const [selected, setSelected] = useState<string[]>([
    "title",
    "mimeType",
    "pages",
    "ingestedAt",
    "createdAt",
  ]);
  const visible = columns.filter((column) => selected.includes(column.key));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <p className="text-sm">
          <strong className="text-lg tabular-nums">
            {total.toLocaleString("tr-TR")}
          </strong>{" "}
          <span className="text-muted-foreground">sonuç</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Sonuç görünümü"
            className="inline-flex gap-1 rounded-lg bg-muted p-1"
          >
            <Button
              size="sm"
              variant={view === "list" ? "outline" : "ghost"}
              aria-pressed={view === "list"}
              onClick={() => setView("list")}
            >
              <LayoutList />
              Liste
            </Button>
            <Button
              size="sm"
              variant={view === "table" ? "outline" : "ghost"}
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
            >
              <Table2 />
              Tablo
            </Button>
          </div>
          <ExportCsvButton
            name="arama-sonuclari"
            headers={visible.map((column) => column.label)}
            rows={hits.map((hit) => visible.map((column) => column.value(hit)))}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Bu sayfada {hits.length} sonuç gösteriliyor. CSV dışa aktarımı bu sayfadaki sonuçları içerir.</p>
      {view === "table" ? (
        <>
          <details className="rounded-lg border border-border p-3 text-sm">
            <summary className="flex cursor-pointer items-center gap-2 font-medium">
              <Columns3 className="size-4" />
              Tablo ve CSV sütunları
            </summary>
            <div className="mt-3 flex flex-wrap gap-4">
              {columns.map((column) => (
                <label key={column.key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(column.key)}
                    disabled={column.key === "title"}
                    onChange={(event) =>
                      setSelected(
                        event.target.checked
                          ? [...selected, column.key]
                          : selected.filter((key) => key !== column.key),
                      )
                    }
                  />
                  {column.label}
                </label>
              ))}
            </div>
          </details>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {visible.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className="whitespace-nowrap px-4 py-3 font-medium"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hits.map((hit) => (
                  <tr
                    key={hit.documentId}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    {visible.map((column) => (
                      <td key={column.key} className="px-4 py-4">
                        {column.key === "title" ? (
                          <Link
                            href={`/documents/${hit.documentId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {hit.title}
                          </Link>
                        ) : (
                          column.value(hit)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <SearchResults hits={hits} />
      )}
    </div>
  );
}
