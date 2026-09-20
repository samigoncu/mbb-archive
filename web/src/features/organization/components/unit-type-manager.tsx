"use client";

import { useState } from "react";
import { Building2, Plus, Power, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteUnitTypeAction,
  saveUnitTypeAction,
  setUnitTypeActiveAction,
  type UnitTypeResult,
} from "@/features/organization/api/unit-type-actions";
import type { UnitTypeItem } from "@/features/organization/model/unit-type";

const emptyDraft = { code: "", name: "", level: 1, canHoldMembers: true };

/**
 * Teşkilat seviyeleri: daire başkanlığı, şube müdürlüğü, servis…
 *
 * <para>
 * Kurumun kalıbı bugüne kadar yalnız birim adlarının içinde yaşıyordu:
 * "Bilgi İşlem Dairesi Başkanlığı" adından bunun bir daire başkanlığı olduğu
 * okunuyordu ama sistem bilmiyordu. Bu yüzden kalıp ne zorlanabiliyor ne de
 * kurumdan kuruma değiştirilebiliyordu. Artık tanım verisidir.
 * </para>
 */
export function UnitTypeManager({ types, canManage }: {
  types: UnitTypeItem[];
  canManage: boolean;
}) {
  const [items, setItems] = useState(types);
  const [draft, setDraft] = useState<typeof emptyDraft | null>(null);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  async function run(key: string, work: () => Promise<UnitTypeResult>, success: string) {
    if (pending || !canManage) return;
    setPending(key); setError("");
    try {
      const result = await work();
      if (result.error || !result.types) { setError(result.error ?? "İşlem tamamlanamadı."); return; }
      setItems(result.types);
      toast.success(success);
      return result;
    } catch { setError("Sunucuya ulaşılamadı. Sayfayı yenileyip tekrar deneyin."); }
    finally { setPending(""); }
  }

  return <section aria-label="Birim seviyeleri" className="rounded-xl border border-border bg-card">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
      <div className="flex items-start gap-2">
        <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold">Teşkilat seviyeleri</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Kurumun kademelenmesi. Derinliği küçük olan üsttedir; bir birim yalnız kendisinden
            daha sığ bir birimin altına açılabilir — ara kademeyi atlamak serbesttir.
          </p>
        </div>
      </div>
      {canManage && !draft && <Button type="button" size="sm" onClick={() => setDraft(emptyDraft)}>
        <Plus className="size-4" aria-hidden />Seviye ekle
      </Button>}
    </header>

    {draft && <form className="space-y-3 border-b border-border bg-muted/20 p-4" onSubmit={async event => {
      event.preventDefault();
      const result = await run("create",
        () => saveUnitTypeAction(draft.code, { name: draft.name, level: draft.level, canHoldMembers: draft.canHoldMembers }, true),
        "Seviye eklendi.");
      if (result && !result.error) setDraft(null);
    }}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium">Kod
          <Input className="mt-1.5" required maxLength={60} value={draft.code} placeholder="WorkingGroup"
            onChange={e => setDraft({ ...draft, code: e.target.value })} />
          <span className="mt-1 block font-normal text-muted-foreground">Sonradan değişmez.</span>
        </label>
        <label className="text-xs font-medium">Görünen ad
          <Input className="mt-1.5" required maxLength={100} value={draft.name} placeholder="Çalışma Grubu"
            onChange={e => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label className="text-xs font-medium">Derinlik
          <Input className="mt-1.5" type="number" min={1} max={50} value={draft.level}
            onChange={e => setDraft({ ...draft, level: Number(e.target.value) })} />
        </label>
        <div className="flex flex-col justify-end gap-1.5 text-xs">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={draft.canHoldMembers}
              onChange={e => setDraft({ ...draft, canHoldMembers: e.target.checked })} />
            personel bağlanabilir
          </label>
          <span className="text-muted-foreground">
            Yalnız hiyerarşi taşıyan ara kademelerde kapatın.
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={!!pending}>{pending === "create" ? "Kaydediliyor…" : "Kaydet"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setDraft(null)}>Vazgeç</Button>
      </div>
    </form>}

    <ul className="divide-y divide-border">
      {items.map(type => <li key={type.code} className="flex flex-wrap items-center gap-3 p-3 text-sm">
        <span className="w-8 shrink-0 text-center font-mono text-xs text-muted-foreground">{type.level}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{type.name}</span>
          <span className="block font-mono text-xs text-muted-foreground">{type.code}</span>
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{type.unitCount} birim</span>
        {type.canHoldMembers
          ? <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-2xs text-muted-foreground">
              <Users className="size-3" aria-hidden />personel
            </span>
          : <span className="rounded-full border border-border px-2 py-0.5 text-2xs text-muted-foreground">yalnız kademe</span>}
        {!type.isActive && <span className="rounded-full border border-border px-2 py-0.5 text-2xs text-muted-foreground">pasif</span>}
        {canManage && <span className="flex shrink-0 gap-1">
          <Input className="h-7 w-32" defaultValue={type.name} aria-label={`${type.code} adı`} disabled={!!pending}
            onBlur={e => {
              if (e.target.value !== type.name) {
                void run(`name-${type.code}`,
                  () => saveUnitTypeAction(type.code, { name: e.target.value, level: type.level, canHoldMembers: type.canHoldMembers }, false),
                  "Seviye güncellendi.");
              }
            }} />
          <Button type="button" size="icon-sm" variant="ghost" disabled={!!pending}
            aria-label={type.isActive ? `${type.name} pasife al` : `${type.name} etkinleştir`}
            onClick={() => void run(`active-${type.code}`, () => setUnitTypeActiveAction(type.code, !type.isActive),
              type.isActive ? "Seviye pasife alındı." : "Seviye etkinleştirildi.")}>
            <Power className="size-4" aria-hidden />
          </Button>
          {!type.isBuiltIn && type.unitCount === 0 && <Button type="button" size="icon-sm" variant="ghost" disabled={!!pending}
            aria-label={`${type.name} seviyesini sil`}
            onClick={() => void run(`delete-${type.code}`, () => deleteUnitTypeAction(type.code), "Seviye silindi.")}>
            <Trash2 className="size-4" aria-hidden />
          </Button>}
        </span>}
      </li>)}
      {items.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Teşkilat seviyesi tanımlı değil.</li>}
    </ul>

    {error && <p role="alert" className="m-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    {canManage && <p className="border-t border-border p-3 text-xs leading-5 text-muted-foreground">
      Kurulumla gelen seviyeler silinemez; teşkilat şemanızda karşılığı yoksa pasife alın —
      o seviyedeki geçmiş birimler okunur kalır, yeni birim açılamaz. Kullanımdaki bir seviye
      ancak birimleri başka seviyeye taşındıktan sonra silinebilir.
    </p>}
  </section>;
}
