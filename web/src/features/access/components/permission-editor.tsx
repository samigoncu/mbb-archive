"use client";
import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { accessAdministrationAction } from "../api/administration-actions";
import { moduleLabels, permissionNames, type ManagedRole } from "../model/administration";
export function PermissionEditor({ role, catalog }: { role: ManagedRole; catalog: string[] }) {
  const [selected, setSelected] = useState(new Set(role.permissions));
  const [search, setSearch] = useState("");
  const codes = [...new Set([...catalog, ...role.permissions])].sort();
  const groups = [...new Set(codes.map(code => code.split(".")[0]))];
  function toggle(codes: string[], checked: boolean) { setSelected(previous => { const next = new Set(previous); for (const code of codes) { if (checked) next.add(code); else next.delete(code); } return next; }); }
  return <ActionForm action={accessAdministrationAction} label="Rol ve izinleri kaydet">
    <input type="hidden" name="operation" value="role-update" /><input type="hidden" name="id" value={role.id} /><input type="hidden" name="version" value={role.version} />
    {[...selected].map(code => <input key={code} type="hidden" name="permissions" value={code} />)}
    <label className="block text-sm font-medium">Rol adı<Input name="name" defaultValue={role.name} required maxLength={300} className="mt-1" /></label>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4"><h3 className="text-sm font-semibold">İşlem izinleri <span className="text-primary">{selected.size} / {codes.length}</span></h3><button type="button" onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground underline">Seçimleri temizle</button></div>
    <Input aria-label="İzinlerde ara" value={search} onChange={e => setSearch(e.target.value)} placeholder="İzin adı veya kodu ara…" />
    {selected.has("access.admin") && <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Kullanıcı ve yetki yöneticisi, diğer hesapların rollerini ve tüm işlem izinlerini değiştirebilir.</p>}
    {["documents.read.all","documents.manage.all","physical-archive.manage.all"].some(code => selected.has(code)) && <p className="rounded-lg border border-amber-200 p-3 text-xs">Tüm birimleri kapsayan izin seçildi. Birim sınırlarını genişletir; ilgili görüntüleme veya yönetim işlem izni ayrıca gerekir.</p>}
    <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">{groups.map(group => {
      const all = codes.filter(code => code.startsWith(group + "."));
      const visible = all.filter(code => `${permissionNames[code] ?? code} ${code} ${moduleLabels[group] ?? group}`.toLocaleLowerCase("tr-TR").includes(search.toLocaleLowerCase("tr-TR")));
      if (!visible.length) return null;
      return <fieldset key={group} className="rounded-lg border border-border p-3"><legend className="px-1 text-sm font-semibold">{moduleLabels[group] ?? group}</legend><label className="mb-3 flex items-center gap-2 border-b border-border pb-2 text-xs"><input type="checkbox" checked={all.every(code => selected.has(code))} onChange={e => toggle(all, e.target.checked)} />Bu modüldeki tüm izinler ({all.filter(code => selected.has(code)).length}/{all.length})</label><div className="grid gap-3 xl:grid-cols-2">{visible.map(code => <label key={code} className="flex cursor-pointer items-start gap-2 text-sm"><input className="mt-1 shrink-0" type="checkbox" checked={selected.has(code)} onChange={e => toggle([code],e.target.checked)} /><span>{permissionNames[code] ?? "Özel izin"}<span className="mt-0.5 block break-all text-[11px] text-muted-foreground">{code}</span></span></label>)}</div></fieldset>;
    })}</div>
    <p className="text-xs leading-5 text-muted-foreground">İşlem izinleri birim üyeliğinden ayrıdır. Seçimleri kaldırmak, bu rolden gelen izinleri geri alır; kullanıcının diğer rolleri geçerliliğini korur.</p>
  </ActionForm>;
}
