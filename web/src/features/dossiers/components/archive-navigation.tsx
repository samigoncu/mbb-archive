"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FolderOpen, FolderTree } from "lucide-react";
import type { ArchiveUnit } from "../model/dossier";
import type { FilePlanTree } from "@/features/classification/model/classification";
import { ArchivePlanTree } from "./archive-plan-tree";

export function ArchiveNavigation({ units, trees, ownerUnitId, filePlanCode, basePath = "/documents", requireUnit = false }: {
  units: ArchiveUnit[]; trees: FilePlanTree[]; ownerUnitId?: string; filePlanCode?: string; basePath?: string; requireUnit?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedUnit, setSelectedUnit] = useOptimistic(ownerUnitId ?? "");
  const unit = units.find(item => item.id === selectedUnit);
  function href(code?: string) {
    const params = new URLSearchParams();
    if (ownerUnitId) params.set("ownerUnitId", ownerUnitId);
    if (code) params.set("filePlanCode", code);
    return params.size ? `${basePath}?${params}` : basePath;
  }
  function changeUnit(id: string) {
    // The old unit's dossier, document selection, topic and pages cannot carry over.
    const params = new URLSearchParams();
    if (id) params.set("ownerUnitId", id);
    startTransition(() => {
      setSelectedUnit(id);
      router.push(params.size ? `${basePath}?${params}` : basePath, { scroll: false });
    });
  }
  return <nav aria-label="Birim ve standart dosya planı" className="self-start rounded-xl border bg-card p-4">
    <h2 className="mb-4 flex items-center gap-2 font-semibold"><FolderTree aria-hidden className="size-4" />Birim arşivi</h2>
    <label className="block text-xs">Daire başkanlığı / birim
      <select aria-label="Daire başkanlığı / birim" name="ownerUnitId" value={selectedUnit} onChange={event => changeUnit(event.target.value)}
        className="mt-1.5 w-full rounded-md border bg-background p-2.5 text-xs">
        {!requireUnit && <option value="">Yetkim kapsamındaki tüm birimler</option>}
        {requireUnit && !units.length && <option value="">Yetkili birim bulunamadı</option>}
        {units.map(item => <option key={item.id} value={item.id}>{`${"　".repeat(Math.max(0, units.filter(parent => parent.id !== item.id && item.path.startsWith(parent.path)).length))}${item.name}`}{item.isActive ? "" : " (pasif)"}</option>)}
      </select>
    </label>
    <div aria-busy={pending} className="mt-4 rounded-lg bg-muted/30 p-2">
      <div className="flex items-start gap-2 px-1 py-2 text-sm font-semibold">
        <FolderOpen aria-hidden className="mt-0.5 size-5 shrink-0 fill-amber-200 text-amber-600 dark:fill-amber-900 dark:text-amber-400" />
        <span>{unit?.name ?? "Yetkim kapsamındaki arşiv"}</span>
      </div>
      {pending ? <p role="status" className="p-3 text-xs text-muted-foreground">Birim arşivi yükleniyor…</p> : <>
        <Link href={href()} className="my-2 block rounded px-1 text-xs text-primary hover:underline">
          {basePath === "/documents" ? "Birimdeki tüm belgeler" : "Birimdeki fiziksel dosyalar"}
        </Link>
        <p className="px-1 text-xs font-medium text-muted-foreground">Standart Dosya Planı</p>
        <div className="max-h-[60vh] overflow-y-auto">{trees.map(tree => <ArchivePlanTree key={`${ownerUnitId ?? "all"}/${tree.id}`} tree={tree} filePlanCode={filePlanCode} href={href} />)}</div>
        {!trees.length && <p className="p-2 text-xs text-muted-foreground">Bu birim kapsamında gösterilecek dosya planı başlığı yok.</p>}
      </>}
    </div>
  </nav>;
}
