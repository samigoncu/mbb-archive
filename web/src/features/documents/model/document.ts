export type DocumentListItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  versionCount: number;
  ownerUnitId?: string | null;
  dossierId?: string | null;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export const documentStatusLabels: Record<string, string> = {
  Draft: "Taslak",
  Processing: "İşleniyor",
  QualityControl: "Kalite Kontrol",
  Active: "Aktif",
  Archived: "Arşivlendi",
  Cancelled: "İptal edildi",
};

/** Backend `sort` parametresiyle birebir. */
export const documentSortOptions = [
  { value: "createdat_desc", label: "En yeni önce" },
  { value: "createdat_asc", label: "En eski önce" },
  { value: "title_asc", label: "Başlık (A-Z)" },
  { value: "title_desc", label: "Başlık (Z-A)" },
] as const;

export type DocumentListCriteria = {
  page: number;
  search?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
  sort?: string;
  ownerUnitId?: string;
  filePlanCode?: string;
  dossierId?: string;
  unfiled?: string;
};
