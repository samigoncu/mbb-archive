import type { ScanContext } from "@/features/scanning/model/scan-context";
export type DocumentFilingState = {
  ownerUnitId: string; version: number; dossierId: string | null; filePlanCode: string | null;
  classification: { planId: string; itemId: string; code: string; title: string } | null;
  folders: { id: string; barcode: string; title: string; filePlanCode: string }[];
};
export type FilingEditorData = { locations?: import("@/features/physical-archive/model/location").LocationListItem[]; locationError?: string; current: DocumentFilingState; choices: ScanContext };
export type FilingChange = { expectedVersion: number; dossierId: string | null; filePlanId: string; filePlanItemId: string;
  expectedFolderIds: string[]; folderIds: string[]; reason: string };
