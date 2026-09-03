"use client";

import { useMemo, useState } from "react";
import {
  locationTypeLabels,
  type LocationListItem,
} from "@/features/physical-archive/model/location";

type LocationPickerProps = {
  locations: LocationListItem[];
  name: string;
  initialLocationId?: string;
};

/**
 * Fiziksel hiyerarşiyi (Kurum Arşivi → Bina → Alan → Oda → Koridor → Dolap →
 * Raf → Kutu) kademeli select'lerle gezdirir. Seçilen en alt düğüm forma
 * `name` alanıyla gönderilir; ara düğüm seçmek de geçerlidir.
 */
export function LocationPicker({
  locations,
  name,
  initialLocationId,
}: LocationPickerProps) {
  const childrenByParent = useMemo(() => {
    const map = new Map<string, LocationListItem[]>();

    for (const location of locations) {
      const key = location.parentId ?? "root";
      const bucket = map.get(key);

      if (bucket) {
        bucket.push(location);
      } else {
        map.set(key, [location]);
      }
    }

    return map;
  }, [locations]);

  const [path, setPath] = useState<string[]>(() =>
    initialLocationId ? buildPath(locations, initialLocationId) : [],
  );

  const levels: LocationListItem[][] = [];
  let parentKey = "root";

  for (let depth = 0; ; depth += 1) {
    const options = childrenByParent.get(parentKey);

    if (!options || options.length === 0) {
      break;
    }

    levels.push(options);
    const selected = path[depth];

    if (!selected) {
      break;
    }

    parentKey = selected;
  }

  const selectedId = path.at(-1) ?? "";

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={selectedId} />

      {levels.map((options, depth) => {
        const label = locationTypeLabels[options[0].type];
        const value = path[depth] ?? "";

        return (
          <div key={`${depth}-${options[0].parentId ?? "root"}`} className="flex flex-col gap-1.5">
            <label
              htmlFor={`${name}-level-${depth}`}
              className="text-xs font-medium text-muted-foreground"
            >
              {label}
            </label>
            <select
              id={`${name}-level-${depth}`}
              value={value}
              onChange={(event) =>
                setPath((current) => {
                  const next = current.slice(0, depth);
                  return event.target.value ? [...next, event.target.value] : next;
                })
              }
              className="h-11 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Seçiniz…</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.code} — {option.name}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

function buildPath(locations: LocationListItem[], targetId: string): string[] {
  const byId = new Map(locations.map((location) => [location.id, location]));
  const path: string[] = [];
  let current = byId.get(targetId);

  while (current) {
    path.unshift(current.id);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return path;
}
