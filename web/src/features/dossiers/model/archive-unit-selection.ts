import type { ArchiveUnit } from "./dossier";

export function selectArchiveUnit(units: ArchiveUnit[], requested?: string): ArchiveUnit | undefined {
  if (requested) return units.find(unit => unit.id === requested);
  return units.find(unit => unit.isPrimary) ?? units.find(unit => !units.some(parent => parent.id === unit.parentId)) ?? units[0];
}
