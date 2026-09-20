"use client";

import { useState } from "react";
import { Layers, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteLocationTypeAction,
  saveLocationTypeAction,
  setLocationTypeActiveAction,
  type LocationTypeResult,
} from "@/features/physical-archive/api/location-type-actions";
import type { LocationTypeItem } from "@/features/physical-archive/model/location";

const emptyDraft = { code: "", name: "", level: 1, canStoreFolder: false, allowsCapacity: false };

/**
 * Yerleşim seviyeleri: bina, oda, dolap, raf…
 *
 * <para>
 * Bu liste eskiden koda gömülüydü ve kurum kendi yapısına seviye ekleyemiyordu.
 * Artık tanım verisi: seviye eklenir, yeniden adlandırılır, derinliği
 * değiştirilir. Bir konum yalnız kendisinden daha sığ bir konumun altına açılır,
 * yani ara seviye atlamak da serbesttir.
 * </para>
 */
export function LocationTypeManager({ types, canManage }: {
  types: LocationTypeItem[];
  canManage: boolean;
}) {
  const [items, setItems] = useState(types);
  const [draft, setDraft] = useState<typeof emptyDraft | null>(null);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  async function run(key: string, work: () => Promise<LocationTypeResult>, success: string) {
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

  return <section aria-label="Yerleşim seviyeleri" className="rounded-xl border border-border bg-card">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
      <div className="flex items-start gap-2">
        <Layers className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <h2 className="text-sm font-semibold">Yerleşim seviyeleri</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Hiyerarşinin kalıbı. Derinliği küçük olan üsttedir; bir konum yalnız kendisinden daha sığ bir konumun altına açılabilir.
          </p>
        </div>
      </div>
      {canManage && !draft && <Button type="button" size="sm" onClick={() => setDraft(emptyDraft)}>
        <Plus className="size-4" aria-hidden />Seviye ekle
      </Button>}
    </header>

    {draft && <form className="space-y-3 border-b border-border bg-muted/20 p-4" onSubmit={async event => {
      event.preventDefault();
      const result = await run("create", () => saveLocationTypeAction(null, draft), "Seviye eklendi.");
      if (result && !result.error) setDraft(null);
    }}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium">Kod
          <Input className="mt-1.5" required maxLength={60} value={draft.code} placeholder="Floor"
            onChange={e => setDraft({ ...draft, code: e.target.value })} />
          <span className="mt-1 block font-normal text-muted-foreground">Sonradan değişmez.</span>
        </label>
        <label className="text-xs font-medium">Görünen ad
          <Input className="mt-1.5" required maxLength={100} value={draft.name} placeholder="Kat"
            onChange={e => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label className="text-xs font-medium">Derinlik
          <Input className="mt-1.5" type="number" min={1} max={50} value={draft.level}
            onChange={e => setDraft({ ...draft, level: Number(e.target.value) })} />
        </label>
        <div className="flex flex-col justify-end gap-1.5 text-xs">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={draft.canStoreFolder}
              onChange={e => setDraft({ ...draft, canStoreFolder: e.target.checked, allowsCapacity: e.target.checked && draft.allowsCapacity })} />
            klasör taşıyabilir
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={draft.allowsCapacity} disabled={!draft.canStoreFolder}
              onChange={e => setDraft({ ...draft, allowsCapacity: e.target.checked })} />
            kapasite tanımlanır
          </label>
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
        <span className="text-xs text-muted-foreground">{type.locationCount} konum</span>
        {type.canStoreFolder && <span className="rounded-full border border-border px-2 py-0.5 text-2xs text-muted-foreground">klasör taşır</span>}
        {!type.isActive && <span className="rounded-full border border-border px-2 py-0.5 text-2xs text-muted-foreground">pasif</span>}
        {canManage && <span className="flex shrink-0 gap-1">
          <Input className="h-7 w-32" defaultValue={type.name} aria-label={`${type.code} adı`} disabled={!!pending}
            onBlur={e => {
              if (e.target.value !== type.name) {
                void run(`name-${type.code}`, () => saveLocationTypeAction(type.code, { ...type, name: e.target.value }), "Seviye güncellendi.");
              }
            }} />
          <Button type="button" size="icon-sm" variant="ghost" disabled={!!pending}
            aria-label={type.isActive ? `${type.name} pasife al` : `${type.name} etkinleştir`}
            onClick={() => void run(`active-${type.code}`, () => setLocationTypeActiveAction(type.code, !type.isActive),
              type.isActive ? "Seviye pasife alındı." : "Seviye etkinleştirildi.")}>
            <Power className="size-4" aria-hidden />
          </Button>
          {!type.isBuiltIn && type.locationCount === 0 && <Button type="button" size="icon-sm" variant="ghost" disabled={!!pending}
            aria-label={`${type.name} seviyesini sil`}
            onClick={() => void run(`delete-${type.code}`, () => deleteLocationTypeAction(type.code), "Seviye silindi.")}>
            <Trash2 className="size-4" aria-hidden />
          </Button>}
        </span>}
      </li>)}
      {items.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">Yerleşim seviyesi tanımlı değil.</li>}
    </ul>

    {error && <p role="alert" className="m-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    {canManage && <p className="border-t border-border p-3 text-xs leading-5 text-muted-foreground">
      Kurulumla gelen seviyeler silinemez, kullanmıyorsanız pasife alın. Kullanımda olan bir seviyenin derinliği, altındaki konumlar kaldırılmadan değiştirilemez.
    </p>}
  </section>;
}
