export type FacetBucket = {
  key: string;
  count: number;
};

export type PageMatch = {
  pageNumber: number;
  fragments: string[];
};

export type SearchHit = {
  documentId: string;
  documentVersionId: string | null;
  title: string;
  mimeType: string | null;
  score: number;
  fragments: string[];
  pages: PageMatch[];
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
  mimeType?: string;
  filePlanCode?: string;
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
