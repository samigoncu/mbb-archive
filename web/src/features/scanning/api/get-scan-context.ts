import "server-only";
import { getUnitPlanAssignments } from "@/features/organization/api/unit-plans";
import { apiGet, ApiError } from "@/lib/api/api-client";
import { whenPermitted } from "@/lib/api/when-permitted";
import { getArchiveUnits, getDossiers } from "@/features/dossiers/api/dossiers";
import { getFolders } from "@/features/physical-archive/api/get-folders";
import { getDocuments } from "@/features/documents/api/get-documents";
import { getFilePlanTree } from "@/features/classification/api/get-classification";
import type { FilePlanListItem } from "@/features/classification/model/classification";
import type { PagedResult } from "@/features/documents/model/document";
import { classificationKey, emptyScanContext, writableScanUnits, type ScanContext, type ScanClassification } from "../model/scan-context";

async function allPages<T>(load: (page: number) => Promise<PagedResult<T>>): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await load(page);
    if (result.totalCount > 10000) throw new ApiError("Bu birimdeki dosya sayısı seçim sınırını aşıyor. Daha dar bir alt birim seçin.", 422);
    items.push(...result.items);
    if (items.length >= result.totalCount) return items;
    if (!result.items.length) throw new ApiError("Dosya listesi tamamlanamadı. Lütfen yeniden deneyin.", 502);
  }
}

// Called only on the server. The browser receives only this unit's options.
export async function getScanContext(ownerUnitId: string, includeRecent = true): Promise<ScanContext> {
  if (!ownerUnitId) return emptyScanContext();
  const unit = writableScanUnits(await getArchiveUnits()).find(u => u.id === ownerUnitId);
  if (!unit) throw new ApiError("Bu birimde tarama ve indeksleme yetkiniz yok.", 403);
  const [dossierRows, folderRows] = await Promise.all([
    allPages(page => getDossiers({ ownerUnitId, page: String(page), pageSize: "100" })),
    unit.canManagePhysical ? whenPermitted(allPages(page => getFolders(page, 100, { ownerUnitId, status: "Available" })), []) : Promise.resolve([]),
  ]);
  // API department filters also include sub-units. Unit selection here is exact.
  const dossiers = dossierRows.filter(d => d.ownerUnitId === ownerUnitId);
  const folders = folderRows.filter(f => f.ownerUnitId === ownerUnitId && f.status === "Available");
  const context: ScanContext = { ...emptyScanContext(ownerUnitId), dossiers, folders };
  const assignments = await getUnitPlanAssignments(ownerUnitId);
  if (assignments.length) {
    const plans = await whenPermitted(allPages(page => apiGet<PagedResult<FilePlanListItem>>(`/classification/file-plans?page=${page}&pageSize=100`, { cache: "no-store" })), []);
    const today = new Date().toISOString().slice(0, 10);
    const active = plans.filter(p => p.isActive && p.effectiveFrom <= today && (!p.effectiveTo || p.effectiveTo >= today));
    const trees = await Promise.all(active.map(p => getFilePlanTree(p.id)));
    const choices: ScanClassification[] = [];
    for (const tree of trees) {
      if (!tree) continue;
      for (const item of tree.items) {
        if (!item.isActive || !item.isSelectable) continue;
        const assigned = assignments.some(entry => entry.planId === tree.id && entry.itemId === item.id);
        if (assigned) choices.push({ key: classificationKey(tree.id, item.id), planId: tree.id, itemId: item.id,
          code: item.code, title: item.title, planName: tree.name, version: tree.version });
      }
    }
    context.classifications = choices.sort((a, b) => a.code.localeCompare(b.code, "tr") || a.version.localeCompare(b.version));
  }
  context.dossiers = dossiers.filter(dossier => context.classifications.some(item => item.planId === dossier.filePlanId && item.itemId === dossier.filePlanItemId));
  context.folders = folders.filter(folder => context.classifications.some(item => item.code === folder.filePlanCode));
  if (includeRecent) {
    for (let page = 1; context.recentDocuments.length < 10; page++) {
      const result = await getDocuments(page, 100, { ownerUnitId });
      context.recentDocuments.push(...result.items.filter(d => d.ownerUnitId === ownerUnitId).slice(0, 10 - context.recentDocuments.length));
      if (page * result.pageSize >= result.totalCount || !result.items.length) break;
    }
  }
  return context;
}
