"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  documentSortOptions,
  documentStatusLabels,
} from "@/features/documents/model/document";

const fieldClass =
  "min-w-0 w-full h-10 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Liste durumunun tamamı URL'de tutulur: paylaşılabilir, yer imlenebilir ve
 * ileride "kayıtlı görünüm" özelliği bu sorgu dizesini saklamaktan ibaret olur.
 */
export function DocumentFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = (key: string) => searchParams.get(key) ?? "";
  const hasFilter = ["search", "status", "createdFrom", "createdTo", "sort"].some(
    (key) => searchParams.get(key),
  );

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["ownerUnitId", "filePlanCode", "dossierId", "year", "dossierSearch", "unfiled", "view", "dossierSort"]) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }

    for (const key of ["search", "status", "createdFrom", "createdTo", "sort"]) {
      const value = String(form.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }

    // Süzgeç değişince seçili belge ve sayfa geçersizdir.
    router.push(params.size > 0 ? `/documents?${params}` : "/documents");
  }

  return (
    <form
      onSubmit={apply}
      aria-label="Belge arama ve filtreler"
      className="min-w-0 rounded-xl border border-border bg-card p-4"
    >
      <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
        <Filter className="size-3.5" aria-hidden />
        Belge arama ve filtreler
      </h2>

      <div className="mt-3 overflow-x-auto pb-1">
      <div className="grid items-end gap-3 sm:grid-cols-2 lg:min-w-[1000px] lg:grid-cols-[minmax(160px,1.2fr)_minmax(150px,1fr)_minmax(280px,2fr)_minmax(150px,1fr)_auto]">
      <div className="min-w-0 flex flex-col gap-1.5">
        <Label htmlFor="search" className="text-xs">
          Başlıkta ara
        </Label>
        <Input
          id="search"
          name="search"
          defaultValue={current("search")}
          placeholder="Örn: kamulaştırma"
          className="h-10"
        />
      </div>

      <div className="min-w-0 flex flex-col gap-1.5">
        <Label htmlFor="status" className="text-xs">
          Durum
        </Label>
        <select
          id="status"
          name="status"
          defaultValue={current("status")}
          className={fieldClass}
        >
          <option value="">İptal edilenler hariç</option>
          {Object.entries(documentStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
        <div className="min-w-0 flex flex-col gap-1.5">
          <Label htmlFor="createdFrom" className="text-xs">
            Kayıt tarihi başlangıcı
          </Label>
          <input
            id="createdFrom"
            name="createdFrom"
            type="date"
            defaultValue={current("createdFrom")}
            className={fieldClass}
          />
        </div>
        <div className="min-w-0 flex flex-col gap-1.5">
          <Label htmlFor="createdTo" className="text-xs">
            Kayıt tarihi bitişi
          </Label>
          <input
            id="createdTo"
            name="createdTo"
            type="date"
            defaultValue={current("createdTo")}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="min-w-0 flex flex-col gap-1.5">
        <Label htmlFor="sort" className="text-xs">
          Sıralama
        </Label>
        <select
          id="sort"
          name="sort"
          defaultValue={current("sort") || "createdat_desc"}
          className={fieldClass}
        >
          {documentSortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2 whitespace-nowrap">
        <Button type="submit" size="sm" className="h-10 flex-1">
          Uygula
        </Button>
        {hasFilter ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-10"
            onClick={() => {
              const p = new URLSearchParams();
              for (const key of ["ownerUnitId", "filePlanCode", "dossierId", "year", "dossierSearch", "unfiled", "view", "dossierSort"]) {
                const value = searchParams.get(key); if (value) p.set(key, value);
              }
              router.push(`/documents?${p}`);
            }}
          >
            <X className="size-3.5" aria-hidden />
            Temizle
          </Button>
        ) : null}
      </div>
      </div>
      </div>
    </form>
  );
}
