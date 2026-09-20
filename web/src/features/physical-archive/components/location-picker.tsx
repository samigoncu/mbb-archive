"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { locationPath } from "@/features/physical-archive/model/location-path";
import {
  locationTypeLabel,
  type LocationListItem,
} from "@/features/physical-archive/model/location";

type LocationPickerProps = {
  locations: LocationListItem[];
  name: string;
  className?: string;
  initialLocationId?: string;
  onLocationChange?: (id: string) => void;
};

/** Türkçe'de "İ/ı" ayrımı nedeniyle arama karşılaştırması yerel kurala göre yapılır. */
const fold = (value: string) => value.toLocaleLowerCase("tr");

/**
 * Dosyanın yerleştirileceği rafı veya kutuyu seçtirir.
 *
 * <para>
 * Kademeli select'ler yerine tek, aranabilir bir liste kullanılır: sekiz
 * seviyeli hiyerarşide (Kurum Arşivi → … → Raf → Kutu) her seçim yeni bir alan
 * açtığı için diyalog aşağı doğru büyüyordu. Liste sabit yüksekliktedir.
 * </para>
 *
 * <para>
 * Yalnız geçerli hedefler listelenir: `PhysicalFolder.Register` klasörü sadece
 * aktif raf veya kutuya kabul eder, ara düğüm seçimi sunucuda reddedilirdi.
 * </para>
 */
export function LocationPicker({
  locations,
  name,
  className,
  initialLocationId,
  onLocationChange,
}: LocationPickerProps) {
  const targets = useMemo(
    () =>
      locations
        // Hangi seviyenin klasör taşıyabileceği katalogdan gelir; arayüzde
        // "Raf ya da Kutu" diye sabitlenmiş değil.
        .filter((location) => location.isActive && location.canStoreFolder)
        .map((location) => ({
          ...location,
          // Üst zincir ikincil satırda gösterilir; yaprağın kendisi zaten başlıkta.
          parentPath: location.parentId
            ? locationPath(locations, location.parentId, "")
            : "",
        }))
        .sort((a, b) => a.code.localeCompare(b.code, "tr")),
    [locations],
  );

  const [selectedId, setSelectedId] = useState(initialLocationId ?? "");
  const [query, setQuery] = useState("");

  const needle = fold(query.trim());
  const matches = needle
    ? targets.filter((target) =>
        fold(`${target.code} ${target.name} ${target.parentPath}`).includes(
          needle,
        ),
      )
    : targets;

  // Seçili kayıt aramanın dışında kalırsa DOM'dan düşer ve form onu gönderemez;
  // bu yüzden eşleşmese de listenin başında tutulur.
  const visible = matches.some((target) => target.id === selectedId)
    ? matches
    : [...targets.filter((target) => target.id === selectedId), ...matches];

  const selected = targets.find((target) => target.id === selectedId);

  return (
    <div className={className ?? "flex flex-col gap-2"}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Arşiv konumu ara"
          placeholder="Konum ara…"
          className="h-9 pl-8"
        />
      </div>

      <div
        role="radiogroup"
        aria-label="Arşiv konumu"
        className="max-h-56 overflow-y-auto rounded-md border border-input bg-card"
      >
        {visible.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {targets.length
              ? "Aramaya uyan konum yok."
              : "Klasör yerleştirilebilecek aktif bir konum tanımlı değil."}
          </p>
        ) : (
          visible.map((target) => {
            const checked = target.id === selectedId;

            return (
              <label
                key={target.id}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 border-b border-border px-3 py-2.5 transition-colors last:border-b-0 hover:bg-muted/60 focus-within:ring-2 focus-within:ring-ring focus-within:ring-inset",
                  checked && "bg-accent",
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={target.id}
                  checked={checked}
                  onChange={() => {
                    setSelectedId(target.id);
                    onLocationChange?.(target.id);
                  }}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {checked && <Check className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {target.code} · {target.name}
                  </span>
                  <span
                    className="block truncate text-xs text-muted-foreground"
                    title={target.parentPath}
                  >
                    {target.parentPath || target.typeName}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {target.typeName || locationTypeLabel(target.type)}
                </span>
              </label>
            );
          })
        )}
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        {selected ? (
          <>
            Seçilen konum:{" "}
            <span className="font-medium text-foreground">
              {selected.code} · {selected.name}
            </span>
          </>
        ) : (
          "Dosyanın yerleştirileceği konumu seçin."
        )}
      </p>
    </div>
  );
}
