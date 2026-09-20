import type { LocationListItem } from "./location";
/** Yalnız erişilebilir kayıtların gerçek üst-alt ilişkisini gösterir. */
export function locationPath(locations: LocationListItem[], id: string, fallback = "Konum belirtilmemiş"): string {
  const byId = new Map(locations.map(location => [location.id, location]));
  const seen = new Set<string>();
  const parts: string[] = [];
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    parts.unshift(current.name || current.code);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return parts.length ? parts.join(" → ") : fallback;
}
