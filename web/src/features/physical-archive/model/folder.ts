export type FolderStatus = "Available" | "OnLoan" | "Transferred" | "Disposed";

export type FolderListItem = {
  id: string;
  ownerUnitId?: string | null;
  digitalDossierId?: string | null;
  barcode: string;
  title: string;
  filePlanCode: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  status: FolderStatus;
  documentCount: number;
  createdAt: string;
  lastMovedAt: string | null;
};

export type FolderFilters = {
  barcode?: string;
  title?: string;
  filePlanCode?: string;
  locationId?: string;
  status?: string;
  year?: string;
  ownerUnitId?: string;
  digitalDossierId?: string;
};

export const folderStatusLabels: Record<FolderStatus, string> = {
  Available: "Rafta",
  OnLoan: "Ödünçte",
  Transferred: "Devredildi",
  Disposed: "İmha Edildi",
};
