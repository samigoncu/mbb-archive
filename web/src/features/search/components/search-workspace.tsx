"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Link2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SearchCondition } from "../model/search";
import { SearchConditionEditor } from "./search-condition-editor";

export function SearchWorkspace({
  initialQuery,
  initialConditions,
  initialMode,
  initialFrom = "",
  initialTo = "",
  initialDateField = "ingestedAt",
  fields,
  hasSearch,
  children,
}: {
  initialQuery: string;
  initialConditions: SearchCondition[];
  initialMode: "basic" | "advanced";
  initialFrom?: string;
  initialTo?: string;
  initialDateField?: "createdAt" | "ingestedAt";
  fields: { key: string; label: string }[];
  hasSearch: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [query, setQuery] = useState(initialQuery);
  const [conditions, setConditions] = useState(initialConditions);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [dateField, setDateField] = useState(initialDateField);
  const [pending, startTransition] = useTransition();
  const advanced = mode === "advanced";
  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({ mode });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (from || to) params.set("dateField", dateField);
    if (query.trim()) params.set("q", query.trim());
    if (conditions.length)
      params.set(
        "conditions",
        JSON.stringify(
          conditions.map((condition) => ({
            ...condition,
            value: condition.value.trim(),
          })),
        ),
      );
    startTransition(() => router.push(`/arama?${params}`));
  }
  function reset() {
    setQuery("");
    setConditions([]);
    setFrom("");
    setTo("");
    setDateField("ingestedAt");
    startTransition(() => router.push(`/arama?mode=${mode}`));
  }
  async function copySearch() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Arama bağlantısı kopyalandı.");
    } catch {
      toast.error(
        "Bağlantı kopyalanamadı. Adres çubuğundaki bağlantıyı kopyalayabilirsiniz.",
      );
    }
  }

  const actions = (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-t border-border pt-4",
        advanced && "justify-end",
      )}
    >
      <Button
        type="submit"
        disabled={pending}
        className="h-10 rounded-lg px-6"
      >
        <Search className="size-4" />
        {pending ? "Aranıyor…" : "Ara"}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={reset}
        disabled={pending}
        className="h-10 rounded-lg px-6"
      >
        Sıfırla
      </Button>
    </div>
  );

  const form = (
    <form
      onSubmit={submit}
      aria-label={advanced ? "Gelişmiş arama" : "Basit arama"}
      className="space-y-4"
    >
      <div className="space-y-2">
        <label htmlFor="search-keywords" className="text-sm font-semibold">
          Anahtar kelimeler
        </label>
        <div className="relative">
          <Search
            className="absolute left-3 top-3.5 size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="search-keywords"
            type="search"
            maxLength={500}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Aramak istediğiniz ifadeyi yazın"
            className="h-12 rounded-lg bg-background pl-10 text-sm"
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Belge başlığı, metni, dosya planı ve coğrafi ilişkilerde arar. Yalnız
          filtrelerle de arama yapabilirsiniz.
        </p>
      </div>
      <fieldset className="grid gap-3 rounded-xl border border-border bg-muted/20 p-3">
        <legend className="px-1 text-sm font-semibold">Tarih aralığı</legend>
        <label className="block space-y-2 text-xs font-medium">
          Tarih türü
          <select
            aria-label="Tarih türü"
            value={dateField}
            onChange={(event) =>
              setDateField(event.target.value as "createdAt" | "ingestedAt")
            }
            className="h-10 w-full rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="ingestedAt">Yüklenme tarihi</option>
            <option value="createdAt">Belge kayıt tarihi</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="min-w-0 space-y-2 text-xs font-medium">
            Başlangıç
            <Input
              aria-label="Başlangıç tarihi"
              type="date"
              min="1900-01-01"
              max={to || "9998-12-31"}
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="h-11 min-w-0 px-2 text-xs"
            />
          </label>
          <label className="min-w-0 space-y-2 text-xs font-medium">
            Bitiş
            <Input
              aria-label="Bitiş tarihi"
              type="date"
              min={from || "1900-01-01"}
              max="9998-12-31"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="h-11 min-w-0 px-2 text-xs"
            />
          </label>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Her iki gün dahildir. Tarihler Türkiye saatine göredir.{" "}
          {dateField === "ingestedAt"
            ? "İlk dosya yüklemesi esas alınır."
            : "Belge kaydının oluşturulduğu gün esas alınır."}
        </p>
      </fieldset>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2.5 text-sm">
        <FileText className="size-4 text-primary" />
        <span>Arama kapsamı</span>
        <strong className="ml-auto text-right text-xs">Erişim yetkiniz olan belgeler</strong>
      </div>
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">
          {advanced ? "Filtreler ve koşullar" : "Ek filtreler"}
        </h2>
        <SearchConditionEditor
          conditions={conditions}
          onChange={setConditions}
          fields={fields}
          compact={true}
        />
        {conditions.length > 0 && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Tüm koşullar birlikte uygulanır. “İçerir” sözcük/ifade eşleşmesidir;
            “Eşittir” büyük/küçük harf dahil tam değeri arar.
          </p>
        )}
      </div>
      {actions}
    </form>
  );

  const intro = (
    <div className="rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center">
      <Search className="mx-auto mb-4 size-8 text-primary" aria-hidden />
      <h2 className="text-lg font-semibold">Arşivde aramaya başlayın</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Bir kelime veya ifade yazıp “Ara” düğmesine basın. Yalnız tarih ya da alan filtreleriyle de arama yapabilirsiniz.</p>
      <p className="mt-3 text-xs text-muted-foreground">Eşleşen belge metinleri ve sayfalar sonuçlarda gösterilir.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1>Genel Arama</h1>
          <p className="mt-2 text-sm text-muted-foreground">Belge başlıkları, içerikleri ve kayıtlı alanlar içinde arayın.</p>
        </div>
        <div className="flex items-center gap-3">
          {hasSearch && (
            <Button variant="outline" size="sm" onClick={copySearch} aria-label="Arama bağlantısını kopyala">
              <Link2 className="size-4" />
              <span className="hidden sm:inline">Bağlantıyı kopyala</span>
            </Button>
          )}
          <div
            role="group"
            aria-label="Arama görünümü"
            className="inline-flex rounded-lg border border-border bg-muted/60 p-1"
          >
            {(
              [
                ["basic", "Basit"],
                ["advanced", "Gelişmiş"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  mode === value
                    ? "bg-background text-primary shadow-sm ring-1 ring-primary/30"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[400px_minmax(0,1fr)]">
      <aside aria-label="Arama ölçütleri" className="min-w-0 rounded-xl border border-border bg-card p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-120px)] lg:overflow-y-auto">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="size-4 text-primary" aria-hidden />{advanced ? "Gelişmiş arama" : "Basit arama"}</div>
        {form}
      </aside>
      <section className="min-w-0" aria-label="Arama sonuçları" aria-busy={pending}>
        {pending && <p role="status" className="mb-4 rounded-lg border border-border bg-muted p-3 text-sm">Aranıyor… Sonuçlar güncelleniyor.</p>}
        {hasSearch && <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground" aria-label="Uygulanan arama özeti">
          {initialQuery && <span className="rounded-full border border-border bg-card px-3 py-1.5">Aranan: {initialQuery}</span>}
          {(initialFrom || initialTo) && <span className="rounded-full border border-border bg-card px-3 py-1.5">{initialDateField === "createdAt" ? "Kayıt tarihi" : "Yüklenme tarihi"}: {initialFrom || "Başlangıç sınırı yok"} – {initialTo || "Bitiş sınırı yok"}</span>}
          {initialConditions.length > 0 && <span className="rounded-full border border-border bg-card px-3 py-1.5">{initialConditions.length} alan koşulu</span>}
        </div>}
        {children}
        {!hasSearch && intro}
      </section>
      </div>
    </div>
  );
}
