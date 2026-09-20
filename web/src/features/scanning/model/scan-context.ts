import type { ArchiveUnit, DigitalDossier } from "@/features/dossiers/model/dossier";
import type { DocumentListItem } from "@/features/documents/model/document";
import type { FolderListItem } from "@/features/physical-archive/model/folder";

export type ScanClassification = { key: string; planId: string; itemId: string; code: string; title: string; planName: string; version: string };
export type ScanContext = { ownerUnitId: string; dossiers: DigitalDossier[]; folders: FolderListItem[]; classifications: ScanClassification[]; recentDocuments: DocumentListItem[] };
export type ScanContextResult = { context: ScanContext; error?: never } | { context?: never; error: string };
export const emptyScanContext = (ownerUnitId = ""): ScanContext => ({ ownerUnitId, dossiers: [], folders: [], classifications: [], recentDocuments: [] });
export const writableScanUnits = (units: ArchiveUnit[]) => units.filter(u => u.isActive && u.canManageDocuments);
export const classificationKey = (planId: string, itemId: string) => `${planId}:${itemId}`;

export function validateScanSelection(context: ScanContext, selection: {
  folderId: string; dossierId: string; filePlanId: string; filePlanItemId: string;
}): string | null {
  const dossier = context.dossiers.find(d => d.id === selection.dossierId);
  const folder = context.folders.find(f => f.id === selection.folderId);
  const classification = context.classifications.find(c => c.planId === selection.filePlanId && c.itemId === selection.filePlanItemId);
  if (selection.dossierId && !dossier) return "Dijital dosya seçili birime ait değil veya artık erişilebilir değil.";
  if (selection.folderId && !folder) return "Fiziksel klasör seçili birime ait değil veya artık erişilebilir değil.";
  if ((selection.filePlanId || selection.filePlanItemId) && !classification) return "Sınıflandırma seçili birime atanmamış veya yürürlükte değil.";
  if (dossier && (!classification || classification.planId !== dossier.filePlanId || classification.itemId !== dossier.filePlanItemId)) return "Sınıflandırma dijital dosyanın SDP konusuyla eşleşmelidir.";
  if (folder?.digitalDossierId && folder.digitalDossierId !== dossier?.id) return "Fiziksel klasörün bağlı olduğu dijital dosya seçilmelidir.";
  if (folder && classification && folder.filePlanCode !== classification.code) return "Fiziksel klasör ve sınıflandırma aynı SDP konusunu kullanmalıdır.";
  return null;
}
