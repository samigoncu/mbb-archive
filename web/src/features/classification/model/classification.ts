export type FilePlanListItem = {
  id: string;
  code: string;
  name: string;
  version: string;
  authority: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  itemCount: number;
};

export type FilePlanNode = {
  id: string;
  parentId: string | null;
  description?: string | null;
  code: string;
  title: string;
  level: number;
  isSelectable: boolean;
  isActive: boolean;
};

export type FilePlanTree = {
  id: string;
  code: string;
  name: string;
  version: string;
  authority: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  items: FilePlanNode[];
};

export type MetadataSchemaListItem = {
  id: string;
  key: string;
  name: string;
  version: number;
  status: string;
  createdAt: string;
  publishedAt: string | null;
  fieldCount: number;
};

export const schemaStatusLabels: Record<string, string> = {
  Draft: "Taslak",
  Published: "Yayında",
  Retired: "Yürürlükten kalktı",
};

/** Backend `MetadataFieldType` ile birebir. */
export type MetadataFieldType =
  | "Text"
  | "TextArea"
  | "Integer"
  | "Decimal"
  | "Boolean"
  | "Date"
  | "DateTime"
  | "Choice"
  | "MultiChoice"
  | "Json"
  | "GeoPoint"
  | "GeoPolygon"
  | "GeoGeometry";

export type MetadataFieldDefinition = {
  id: string;
  key: string;
  label: string;
  fieldType: MetadataFieldType;
  isRequired: boolean;
  isSearchable: boolean;
  isRepeatable: boolean;
  /** Choice/MultiChoice alanlarında seçenekler; JSON string dizisi beklenir. */
  optionsJson: string | null;
};

export type MetadataSchemaDetail = {
  id: string;
  key: string;
  name: string;
  version: number;
  status: string;
  fields: MetadataFieldDefinition[];
};

/** `optionsJson` biçimi bozuksa alan seçeneksiz kalır, hata fırlatılmaz. */
export function parseFieldOptions(optionsJson: string | null): string[] {
  if (!optionsJson) return [];

  try {
    const parsed: unknown = JSON.parse(optionsJson);
    return Array.isArray(parsed)
      ? parsed.filter((option): option is string => typeof option === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * Üstveri alan türleri.
 *
 * Sunucu bileşeni de kullandığı için düz modülde durur: `"use client"`
 * modülünden dışa aktarılan sabit, sunucu tarafında istemci referansına
 * dönüşür ve arama boş döner.
 */
export const metadataFieldTypeLabels: Record<string, string> = {
  Text: "Metin",
  TextArea: "Uzun metin",
  Integer: "Tam sayı",
  Decimal: "Ondalık sayı",
  Boolean: "Evet / Hayır",
  Date: "Tarih",
  DateTime: "Tarih ve saat",
  Choice: "Tek seçim",
  MultiChoice: "Çok seçim",
  Json: "JSON",
  GeoPoint: "Harita Konumu (Nokta / Koordinat)",
  GeoPolygon: "Harita Alanı (Poligon / Saha / Parsel)",
  GeoGeometry: "Coğrafi Geometri (Nokta, Çizgi veya Poligon)",
};
