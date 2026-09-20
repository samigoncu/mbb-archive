"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, Panel } from "@/components/ui/page";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionForm } from "@/components/action-form";
import { accessAdministrationAction } from "@/features/access/api/administration-actions";
import { PermissionEditor } from "@/features/access/components/permission-editor";
import { moduleLabels, type ManagedRole } from "@/features/access/model/administration";

/**
 * Rol yönetimi.
 *
 * <para>
 * Roller satır listesinde durur: adı, kodu, kaç izin taşıdığı, kaç kullanıcıya
 * atandığı ve hangi modüllere dokunduğu bir bakışta görünür. Düzenleme ve silme
 * satırdan açılır; izin seçimi ayrı bir pencerede, çünkü onlarca izin listesi
 * tabloyu okunmaz hale getiriyordu.
 * </para>
 */
export function RoleAdministration({ roles, catalog }: { roles: ManagedRole[]; catalog: string[] }) {
  const [editing, setEditing] = useState<ManagedRole | null>(null);
  const [removing, setRemoving] = useState<ManagedRole | null>(null);
  const [creating, setCreating] = useState(false);

  return <div className="flex flex-col gap-4">
    <Panel
      title="Roller"
      description="Rol, bir grup işlem iznini bir arada taşır ve kullanıcılara atanır."
      actions={<Button type="button" size="sm" onClick={() => setCreating(true)}>
        <Plus className="size-4" aria-hidden />Yeni rol oluştur
      </Button>}
    >
      {roles.length === 0
        ? <EmptyState
            icon={ShieldCheck}
            title="Henüz rol tanımlanmadı"
            description="Önce rolü oluşturun, izinlerini seçin, sonra kullanıcılara atayın."
          />
        : <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Roller ve izin kapsamları</caption>
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  {["Rol", "Kapsadığı modüller", "İzin", "Kullanıcı", "İşlemler"].map(label => (
                    <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roles.map(role => {
                  const modules = [...new Set(role.permissions.map(code => code.split(".")[0]))].sort();
                  return <tr key={role.id} className="align-top hover:bg-muted/30">
                    <td className="max-w-xs px-4 py-3">
                      <span className="flex items-start gap-3">
                        <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
                          <ShieldCheck className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{role.name}</span>
                          <span className="block truncate font-mono text-xs text-muted-foreground">{role.code}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        {modules.length === 0
                          ? <span className="text-xs text-muted-foreground">İzin atanmamış</span>
                          : modules.slice(0, 4).map(group => (
                              <Badge key={group} variant="outline">{moduleLabels[group] ?? group}</Badge>
                            ))}
                        {modules.length > 4 && <Badge variant="outline">+{modules.length - 4}</Badge>}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <KeyRound className="size-3.5" aria-hidden />{role.permissions.length}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Users className="size-3.5" aria-hidden />{role.memberCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(role)}>
                          <Pencil className="size-4" aria-hidden />Düzenle
                        </Button>
                        <Button type="button" size="icon-sm" variant="ghost"
                          aria-label={`${role.name} rolünü sil`} onClick={() => setRemoving(role)}>
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </span>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>}
    </Panel>

    <p className="text-xs leading-5 text-muted-foreground">
      İzinler yalnız ne yapılabileceğini belirler; hangi birimin kayıtlarında geçerli olduğunu
      kullanıcının birim üyelikleri belirler. Kullanıcı atamaları{" "}
      <Link href="?tab=users" className="underline underline-offset-2">Kullanıcılar</Link> sekmesinden yapılır.
    </p>

    <Dialog open={creating} onOpenChange={setCreating}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni rol</DialogTitle>
          <DialogDescription>Rolü oluşturduktan sonra izinlerini seçebilirsiniz.</DialogDescription>
        </DialogHeader>
        <ActionForm action={accessAdministrationAction} label="Rol oluştur">
          <input type="hidden" name="operation" value="role-create" />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-code">Rol kodu</Label>
            <Input id="role-code" name="code" required maxLength={100} placeholder="arsiv-sorumlusu" className="font-mono" />
            <span className="text-xs text-muted-foreground">Kimlik sağlayıcıdaki rol koduyla eşleşmelidir; sonradan değişmez.</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-name">Rol adı</Label>
            <Input id="role-name" name="name" required maxLength={300} placeholder="Arşiv sorumlusu" />
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>

    {editing && <Dialog open onOpenChange={open => { if (!open) setEditing(null); }}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Rol: {editing.name}</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{editing.code}</span> · {editing.memberCount} kullanıcıya atanmış.
            Değişiklik, rolü taşıyan herkesi etkiler.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <PermissionEditor key={`${editing.id}/${editing.version}`} role={editing} catalog={catalog} />
        </div>
      </DialogContent>
    </Dialog>}

    {removing && <Dialog open onOpenChange={open => { if (!open) setRemoving(null); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{removing.name} rolünü sil</DialogTitle>
          <DialogDescription><span className="font-mono">{removing.code}</span></DialogDescription>
        </DialogHeader>
        {removing.memberCount > 0
          ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              Bu rol {removing.memberCount} kullanıcıya atanmış. Kullanıcı ataması olan rol silinmez;
              önce Kullanıcılar sekmesinden atamaları kaldırın.
            </p>
          : <ActionForm action={accessAdministrationAction} label="Rolü sil">
              <input type="hidden" name="operation" value="role-delete" />
              <input type="hidden" name="id" value={removing.id} />
              <input type="hidden" name="version" value={removing.version} />
              <label className="flex items-start gap-2 text-xs leading-5">
                <input type="checkbox" name="confirm" required className="mt-1" />
                Bu rolü kaldırmak istiyorum. Kimlik sağlayıcısındaki aynı kodlu rolün uygulama
                izinleri de kaldırılır. İşlem geri alınamaz.
              </label>
            </ActionForm>}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Kapat</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>}
  </div>;
}
