"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { folderStatusLabels } from "@/features/physical-archive/model/folder";

const detailFields = [
  { name: "barcode", label: "Barkod" },
  { name: "filePlanCode", label: "Dosya Planı Kodu" },
  { name: "year", label: "Yıl", type: "number" },
] as const;

export function FolderFiltersBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDetailOpen, setIsDetailOpen] = useState(
    () => detailFields.some((field) => searchParams.get(field.name)) || Boolean(searchParams.get("status")),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      const trimmed = String(value).trim();

      if (trimmed) {
        params.set(key, trimmed);
      }
    }

    router.push(params.size > 0 ? `/dosya-islemleri?${params}` : "/dosya-islemleri");
  }

  const hasFilters = Array.from(searchParams.keys()).some((key) => key !== "page");

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            name="title"
            defaultValue={searchParams.get("title") ?? ""}
            placeholder="Dosya başlığında ara…"
            aria-label="Hızlı arama"
            className="pl-9"
          />
        </div>

        <Button type="submit" size="sm">
          Ara
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsDetailOpen((open) => !open)}
          aria-expanded={isDetailOpen}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Detaylı Arama
        </Button>

        {hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => router.push("/dosya-islemleri")}>
            <X className="size-4" aria-hidden />
            Temizle
          </Button>
        ) : null}
      </div>

      {isDetailOpen ? (
        <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
          {detailFields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1.5">
              <Label htmlFor={`filter-${field.name}`}>{field.label}</Label>
              <Input
                id={`filter-${field.name}`}
                name={field.name}
                type={"type" in field ? field.type : "text"}
                defaultValue={searchParams.get(field.name) ?? ""}
              />
            </div>
          ))}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="filter-status">Durum</Label>
            <select
              id="filter-status"
              name="status"
              defaultValue={searchParams.get("status") ?? ""}
              className="h-9 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Tümü</option>
              {Object.entries(folderStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </form>
  );
}
