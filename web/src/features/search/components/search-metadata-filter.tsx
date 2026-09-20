"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MetadataSchemaDetail } from "@/features/classification/model/classification";

type SearchableField = {
  key: string;
  label: string;
  schemaName: string;
};

/**
 * Üstveri araması yalnız şemada `isSearchable` işaretli alanlar için yapılır;
 * indekslenmemiş alanda arama sonuç döndürmez, bu yüzden listelenmez.
 *
 * Arama projeksiyonu alan anahtarlarını `<şema anahtarı>.<alan anahtarı>`
 * biçiminde saklar; filtre de bu tam nitelikli anahtarla gönderilir.
 */
export function SearchMetadataFilter({
  schemas,
}: {
  schemas: MetadataSchemaDetail[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const fields: SearchableField[] = schemas.flatMap((schema) =>
    schema.fields
      .filter((field) => field.isSearchable)
      .map((field) => ({
        key: `${schema.key}.${field.key}`,
        label: field.label,
        schemaName: schema.name,
      })),
  );

  if (fields.length === 0) {
    return null;
  }

  const activeKey = searchParams.get("metadataKey") ?? "";
  const activeValue = searchParams.get("metadataValue") ?? "";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const key = String(form.get("metadataKey") ?? "").trim();
    const value = String(form.get("metadataValue") ?? "").trim();
    const params = new URLSearchParams(searchParams.toString());

    if (key && value) {
      params.set("metadataKey", key);
      params.set("metadataValue", value);
    } else {
      params.delete("metadataKey");
      params.delete("metadataValue");
    }

    params.delete("page");
    router.push(`/arama?${params}`);
  }

  function clear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("metadataKey");
    params.delete("metadataValue");
    params.delete("page");
    router.push(`/arama?${params}`);
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold">
        <SlidersHorizontal className="size-3.5" aria-hidden />
        Üstveri Araması
      </h2>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="metadataKey" className="text-xs">
          Alan
        </Label>
        <select
          id="metadataKey"
          name="metadataKey"
          defaultValue={activeKey}
          className="h-9 rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">— Alan seçin —</option>
          {fields.map((field) => (
            <option key={field.key} value={field.key}>
              {field.label} ({field.schemaName})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="metadataValue" className="text-xs">
          Değer
        </Label>
        <Input
          id="metadataValue"
          name="metadataValue"
          defaultValue={activeValue}
          placeholder="Örn: E-2026-00145"
          className="h-9"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" className="flex-1">
          Uygula
        </Button>
        {activeKey && activeValue ? (
          <Button type="button" size="sm" variant="outline" onClick={clear}>
            <X className="size-3.5" aria-hidden />
            Temizle
          </Button>
        ) : null}
      </div>
    </form>
  );
}
