import type { ArchiveUnit, DigitalDossier } from "@/features/dossiers/model/dossier";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import type { FilePlanListItem, FilePlanTree } from "@/features/classification/model/classification";
import type { ScanContext } from "./scan-context";
export const unit = (id = "bid"): ArchiveUnit => ({ id, name: id, path: `/${id}/`, parentId: null, isActive: true, isPrimary: true, canManageDocuments: true, canManagePhysical: true });
export const dossier = (ownerUnitId = "bid", id = "digital-bid"): DigitalDossier => ({ id, ownerUnitId, ownerUnitName: ownerUnitId, filePlanId: "plan", filePlanItemId: "topic", filePlanVersion: "v1", filePlanCode: "TEST.01", filePlanTitle: "Birim konusu", title: id, year: 2026, documentCount: 0 });
export const folder = (ownerUnitId = "bid", id = "physical-bid"): FolderListItem => ({ id, ownerUnitId, digitalDossierId: null, barcode: id, title: id, filePlanCode: "TEST.02", locationId: "shelf", locationCode: "shelf", locationName: "Raf", status: "Available", documentCount: 0, createdAt: "2026-01-01", lastMovedAt: null });
export const plan: FilePlanListItem = { id: "plan", code: "SDP", name: "Ortak plan", version: "v1", authority: "Test", isActive: true, effectiveFrom: "2000-01-01", effectiveTo: null, itemCount: 3 };
export const tree: FilePlanTree = { ...plan, items: [
  { id: "topic", parentId: null, code: "TEST.01", title: "Birim konusu", level: 1, isSelectable: true, isActive: true },
  { id: "physical-topic", parentId: null, code: "TEST.02", title: "Fiziksel dosya konusu", level: 1, isSelectable: true, isActive: true },
  { id: "foreign-topic", parentId: null, code: "TEST.99", title: "Diğer birimin konusu", level: 1, isSelectable: true, isActive: true },
] };
export const context = (ownerUnitId = "bid"): ScanContext => ({ ownerUnitId, dossiers: [dossier(ownerUnitId)], folders: [folder(ownerUnitId)], classifications: [
  { key: "plan:topic", planId: "plan", itemId: "topic", code: "TEST.01", title: "Birim konusu", planName: "SDP", version: "v1" },
  { key: "plan:physical-topic", planId: "plan", itemId: "physical-topic", code: "TEST.02", title: "Fiziksel konu", planName: "SDP", version: "v1" },
], recentDocuments: [] });
