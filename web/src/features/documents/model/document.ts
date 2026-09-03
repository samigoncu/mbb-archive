export type DocumentListItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  versionCount: number;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};
