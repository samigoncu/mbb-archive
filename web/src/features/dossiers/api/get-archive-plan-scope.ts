import "server-only";
import { getUnitPlanAssignments } from "@/features/organization/api/unit-plans";

import { ApiError } from "@/lib/api/api-client";
import type { FilePlanTree } from "@/features/classification/model/classification";
import type { PagedResult } from "@/features/documents/model/document";
import { getFolders } from "@/features/physical-archive/api/get-folders";
import { getArchiveUnits, getDossiers } from "./dossiers";
import { scopeArchivePlans, type ArchivePlanUsage } from "../model/archive-plan-scope";

export async function getArchivePlanScope(trees: FilePlanTree[], ownerUnitId: string | undefined, kind: "digital" | "physical") {
  const [assignments, units] = await Promise.all([getUnitPlanAssignments(), getArchiveUnits()]);
  const selected = units.find(unit => unit.id === ownerUnitId);
  const allowedIds = new Set(units.filter(unit => !ownerUnitId || (selected && unit.path.startsWith(selected.path))).map(unit => unit.id));
  const assigned = assignments.filter(item => allowedIds.has(item.unitId));
  const usage: ArchivePlanUsage[] = assigned.map(item => ({ planId: item.planId, itemId: item.itemId, code: item.code }));
  // Scope comes from the authenticated API, including authorized child units. Never derive it from a visible result page.
  async function collect<T>(load: (page: number) => Promise<PagedResult<T>>, project: (item: T) => ArchivePlanUsage) {
    let received = 0;
    for (let page = 1; ; page++) {
      const result = await load(page);
      usage.push(...result.items.map(project));
      received += result.items.length;
      if (received >= result.totalCount) break;
      if (!result.items.length) throw new ApiError("Birim dosya planı tamamlanamadı. Yeniden deneyin.", 502);
    }
  }
  if (kind === "digital") {
    await collect(page => getDossiers({ ownerUnitId, page: String(page), pageSize: "100" }),
      dossier => ({ code: dossier.filePlanCode, planId: dossier.filePlanId, itemId: dossier.filePlanItemId }));
  } else {
    await collect(page => getFolders(page, 100, { ownerUnitId }), folder => ({ code: folder.filePlanCode }));
  }
  return scopeArchivePlans(trees, usage);
}
