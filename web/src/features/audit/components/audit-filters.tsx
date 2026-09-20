"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { Filter, X } from "lucide-react";
import { auditEventLabel } from "../model/audit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fieldClass =
  "h-9 rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const filterKeys = [
  "activity",
  "eventName",
  "documentId",
  "actor",
  "from",
  "to",
  "take",
] as const;

/**
 * Süzgeç durumu URL'de tutulur; bir denetim bulgusu böylece bağlantı olarak
 * paylaşılabilir.
 */
export function AuditFilters({ eventNames }: { eventNames: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = (key: string) => searchParams.get(key) ?? "";
  const hasFilter = filterKeys.some((key) => searchParams.get(key));

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const key of filterKeys) {
      const value = String(form.get(key) ?? "").trim();
      if (value) params.set(key, value);
    }

    router.push(params.size > 0 ? `/denetim?${params}` : "/denetim");
  }

  return (
    <form
      onSubmit={apply}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
    >
      <h2 className="inline-flex w-full items-center gap-1.5 text-sm font-semibold">
        <Filter className="size-3.5" aria-hidden />
        Süzgeç
      </h2>

      <label className="flex flex-col gap-1.5 text-xs" htmlFor="audit-activity">
        İşlem grubu
        <select id="audit-activity" name="activity" defaultValue={current("activity")} className={fieldClass}>
          <option value="">Tüm işlemler</option>
          <option value="user">Kullanıcı işlemleri</option>
          <option value="system">Sistem işlemleri</option>
        </select>
      </label>
      <div className="flex min-w-56 flex-1 flex-col gap-1.5">
        <Label htmlFor="eventName" className="text-xs">
          Olay türü
        </Label>
        <select
          id="eventName"
          name="eventName"
          defaultValue={current("eventName")}
          className={fieldClass}
        >
          <option value="">— Tümü —</option>
          {eventNames.map((name) => (
            <option key={name} value={name}>
              {auditEventLabel(name)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-64 flex-1 flex-col gap-1.5">
        <Label htmlFor="documentId" className="text-xs">
          Belge kimliği
        </Label>
        <Input
          id="documentId"
          name="documentId"
          defaultValue={current("documentId")}
          placeholder="01a06f69-…"
          className="h-9 font-mono text-xs"
        />
      </div>

      {[
        { name: "actor", label: "Kullanıcı kimliği", type: "text" },
        { name: "from", label: "Başlangıç (dahil)", type: "date" },
        { name: "to", label: "Bitiş (hariç)", type: "date" },
      ].map((field) => (
        <label key={field.name} className="flex flex-col gap-1 text-xs">
          {field.label}
          <Input
            name={field.name}
            type={field.type}
            defaultValue={current(field.name)}
          />
        </label>
      ))}
      <div className="flex w-28 flex-col gap-1.5">
        <Label htmlFor="take" className="text-xs">
          Kayıt sayısı
        </Label>
        <select
          id="take"
          name="take"
          defaultValue={current("take") || "100"}
          className={fieldClass}
        >
          {[50, 100, 250, 500].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          Uygula
        </Button>
        {hasFilter ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => router.push("/denetim")}
          >
            <X className="size-3.5" aria-hidden />
            Temizle
          </Button>
        ) : null}
      </div>
    </form>
  );
}
