"use client";
import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { createDossierAction } from "../api/dossier-actions";
import type { ArchiveUnit } from "../model/dossier";
import type { FilePlanTree } from "@/features/classification/model/classification";
import type { UnitPlanAssignment } from "@/features/organization/model/unit-plans";

export function DossierCreateForm({ units, trees, assignments, initialUnitId }: { units: ArchiveUnit[]; trees: FilePlanTree[]; assignments: UnitPlanAssignment[]; initialUnitId?: string }) {
  const [owner, setOwner] = useState(initialUnitId && units.some(unit => unit.id === initialUnitId) ? initialUnitId : units.find(unit => unit.isPrimary)?.id ?? units[0]?.id ?? "");
  const [selection, setSelection] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const options = trees.filter(tree => tree.effectiveFrom <= today && (!tree.effectiveTo || tree.effectiveTo >= today))
    .flatMap(tree => tree.items.filter(item => item.isActive && item.isSelectable && assignments.some(assignment => assignment.unitId === owner && assignment.planId === tree.id && assignment.itemId === item.id))
      .map(item => ({ value: `${tree.id}|${item.id}`, label: `${item.code} · ${item.title} (${tree.version})` })));
  return <ActionForm action={createDossierAction} label="Dijital dosyayı oluştur">
    <label className="text-sm">Sahip birim<select name="ownerUnitId" required value={owner} onChange={event => { setOwner(event.target.value); setSelection(""); }} className="block w-full rounded border bg-background p-2">{units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
    <label className="text-sm">Standart Dosya Planı konusu<select name="planItem" required value={selection} onChange={event => setSelection(event.target.value)} className="block w-full rounded border bg-background p-2"><option value="">Konu seçin</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    {!options.length && <p className="text-sm text-muted-foreground">Bu birime SDP başlığı atanmamış. Birim arşiv sorumlusu, Birim Yönetimi ekranından eşleştirme yapmalıdır.</p>}
    <label className="text-sm">Dosya başlığı<input name="title" required maxLength={300} className="block w-full rounded border bg-background p-2" /></label>
    <label className="text-sm">Yıl<input name="year" type="number" min="1900" max="9999" required defaultValue={new Date().getFullYear()} className="block w-full rounded border bg-background p-2" /></label>
  </ActionForm>;
}
