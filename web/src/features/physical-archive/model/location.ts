/** Backend `ArchiveLocationType` ile birebir; sıralama fiziksel hiyerarşiyi verir. */
export const locationTypes = [
  "InstitutionArchive",
  "Building",
  "ArchiveArea",
  "Room",
  "Aisle",
  "Cabinet",
  "Shelf",
  "Box",
] as const;

export type LocationType = (typeof locationTypes)[number];

export const locationTypeLabels: Record<LocationType, string> = {
  InstitutionArchive: "Kurum Arşivi",
  Building: "Bina",
  ArchiveArea: "Arşiv Alanı",
  Room: "Arşiv Odası",
  Aisle: "Koridor",
  Cabinet: "Dolap",
  Shelf: "Raf",
  Box: "Kutu",
};

export type LocationListItem = {
  id: string;
  parentId: string | null;
  type: LocationType;
  code: string;
  name: string;
  barcode: string;
  isActive: boolean;
};
