export type FacetBucket = {
  key: string;
  count: number;
};

export type PageMatch = {
  pageNumber: number;
  fragments: string[];
};

export type GeoMatch = {
  name: string;
  entityType: string;
  relationType: string;
};

export type SearchHit = {
  documentId: string;
  documentVersionId: string | null;
  title: string;
  mimeType: string | null;
  score: number;
  fragments: string[];
  pages: PageMatch[];
  /** Sonucun neden bulunduğunu gösteren CBS ilişkileri (§30 adım 13). */
  geoMatches: GeoMatch[];
  createdAt?: string | null;
  ingestedAt?: string | null;
};

export type SearchResponse = {
  total: number;
  hits: SearchHit[];
  mimeTypes: FacetBucket[];
  filePlanCodes: FacetBucket[];
};

export type SearchCriteria = {
  q: string;
  page: number;
  pageSize?: number;
  sort?: string;
  mimeType?: string;
  filePlanCode?: string;
  /** Yayınlanmış üstveri şemasındaki aranabilir alan anahtarı. */
  metadataKey?: string;
  metadataValue?: string;
  conditions?: SearchCondition[];
  from?: string;
  to?: string;
  dateField?: "createdAt" | "ingestedAt";
};

export type SearchCondition = {
  field: string;
  operator: "contains" | "notContains" | "equals" | "notEquals";
  value: string;
};

const mimeTypeLabels: Record<string, string> = {
  "application/pdf": "PDF",
  "image/tiff": "TIFF",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
};

export function mimeTypeLabel(mimeType: string): string {
  return mimeTypeLabels[mimeType] ?? mimeType;
}
