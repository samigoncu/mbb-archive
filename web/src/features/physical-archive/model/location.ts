/**
 * Seviye kodu artık sabit bir birlik değil: katalog veritabanından gelir ve
 * kurum kendi seviyelerini ekleyebilir.
 */
export type LocationType = string;

/** Katalogdaki bir yerleşim seviyesi. */
export type LocationTypeItem = {
  code: string;
  name: string;
  level: number;
  canStoreFolder: boolean;
  allowsCapacity: boolean;
  isActive: boolean;
  /** Kurulumla gelen sekiz seviye; yeniden adlandırılır ama silinmez. */
  isBuiltIn: boolean;
  locationCount: number;
};

/**
 * Katalog okunamazsa arayüz kodları çıplak göstermesin diye kurulum
 * seviyelerinin karşılıkları. Tek kaynak katalogdur; bu yalnız yedektir.
 */
const builtInLabels: Record<string, string> = {
  InstitutionArchive: "Kurum Arşivi",
  Building: "Bina",
  ArchiveArea: "Arşiv Alanı",
  Room: "Arşiv Odası",
  Aisle: "Koridor",
  Cabinet: "Dolap",
  Shelf: "Raf",
  Box: "Kutu",
};

export function locationTypeLabel(code: string, types: LocationTypeItem[] = []): string {
  return types.find(type => type.code === code)?.name ?? builtInLabels[code] ?? code;
}

export type LocationListItem = {
  id: string;
  parentId: string | null;
  type: LocationType;
  code: string;
  name: string;
  barcode: string;
  isActive: boolean;
  /** Seviyenin görünen adı; sunucuda katalogla birleştirilir. */
  typeName: string;
  /** Bu konuma doğrudan klasör konulabilir mi. */
  canStoreFolder: boolean;
};

/**
 * Bir konumun altına açılabilecek seviyeler.
 *
 * Kural backend'deki `CanNestUnder` ile aynı: alt seviye üstünden kesin olarak
 * daha derin olmalı. Zincir katı değildir — ara seviye atlanabilir.
 */
export function allowedChildTypes(parentCode: string, types: LocationTypeItem[]): LocationTypeItem[] {
  const parent = types.find(type => type.code === parentCode);
  if (!parent) return [];
  return types.filter(type => type.isActive && type.level > parent.level);
}

export function acceptsCapacity(code: string, types: LocationTypeItem[]): boolean {
  return types.find(type => type.code === code)?.allowsCapacity ?? false;
}
