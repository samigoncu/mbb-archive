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
