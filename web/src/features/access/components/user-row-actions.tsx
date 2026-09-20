"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  loadSubjectAccessAction,
  saveSubjectAccessAction,
} from "@/features/access/api/subject-access-actions";
import { permissionNames, type ManagedSubject } from "@/features/access/model/administration";

/**
 * Kullanıcı satırındaki işlemler.
 *
 * <para>
 * ASP.NET Zero'daki "düzenle / yetkiler / sil" menüsünün bu mimarideki
 * karşılıkları. Uygulama kullanıcı profili tutmaz — ad, e-posta ve parola
 * kurum kimlik sağlayıcısındadır — bu yüzden "düzenle" rol ve birim ataması
 * demektir, "sil" ise kullanıcıyı yok etmek değil uygulama erişimini
 * kaldırmaktır.
 * </para>
 */
export function UserRowActions({ base, subject, onEdit, wrap = true }: {
  base: string;
  subject: ManagedSubject;
  onEdit: () => void;
  /** Tabloda düğmeler tek sırada kalır; dar kartta alt satıra sarabilir. */
  wrap?: boolean;
}) {
  const router = useRouter();
  const [permissions, setPermissions] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function revoke() {
    if (pending) return;
    setPending(true); setError("");

    // Sürüm eşzamanlılık kontrolü için güncel kayıttan alınır.
    const current = await loadSubjectAccessAction(subject.subjectId);
    if (current.error || !current.subject) {
      setPending(false);
      setError(current.error ?? "Kullanıcı bilgileri okunamadı.");
      return;
    }

    const result = await saveSubjectAccessAction({
      subjectId: subject.subjectId,
      version: current.subject.version,
      roleIds: [],
      unitIds: [],
      primaryUnitId: null,
    });
    setPending(false);
    if (result.error) { setError(result.error); return; }

    toast.success(`${subject.subjectId} için uygulama erişimi kaldırıldı.`);
    setRevoking(false);
    router.refresh();
  }

  return <>
    {/* Açılır menü yerine doğrudan düğmeler: eylemler bir tık arkasında
        kaldığında bulunamıyordu. */}
    <span className={cn("flex items-center gap-1.5", wrap ? "flex-wrap" : "whitespace-nowrap")}>
      <Button type="button" size="sm" variant="outline" onClick={onEdit}>
        <Pencil className="size-4" aria-hidden />Düzenle
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => setPermissions(true)}>
        <KeyRound className="size-4" aria-hidden />Yetkiler
      </Button>
      {/* Bağlantı olarak işlendiği için düğme anlamları Link'e bırakılır. */}
      <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`${base}?${new URLSearchParams({ tab: "visibility", subject: subject.subjectId })}`} />}>
        <Building2 className="size-4" aria-hidden />Kapsam
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => { setError(""); setRevoking(true); }}
      >
        <Trash2 className="size-4" aria-hidden />Sil
      </Button>
    </span>

    <Dialog open={permissions} onOpenChange={setPermissions}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Yetkiler: {subject.subjectId}</DialogTitle>
          <DialogDescription>
            {subject.permissions.length} etkin izin, {subject.roleIds.length} rolden geliyor.
            İzinler yalnız rol üzerinden verilir; kullanıcıya doğrudan izin atanmaz.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {subject.permissions.length === 0
            ? <p className="py-8 text-center text-sm text-muted-foreground">Bu kullanıcının etkin izni yok.</p>
            : <ul className="grid gap-2 sm:grid-cols-2">
                {[...subject.permissions].sort().map(code => (
                  <li key={code} className="rounded-lg border border-border p-2.5 text-sm">
                    {permissionNames[code] ?? "Özel izin"}
                    <span className="mt-0.5 block font-mono text-xs break-all text-muted-foreground">{code}</span>
                  </li>
                ))}
              </ul>}
        </div>
        <DialogFooter className="shrink-0">
          <DialogClose render={<Button type="button" variant="outline" />}>Kapat</DialogClose>
          <Button type="button" onClick={() => { setPermissions(false); onEdit(); }}>Rolleri düzenle</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={revoking} onOpenChange={setRevoking}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kullanıcıyı sil</DialogTitle>
          <DialogDescription>{subject.subjectId}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Kullanıcının <strong>{subject.roleIds.length} rolü</strong> ve tüm birim üyelikleri kaldırılır;
            uygulamada hiçbir şeye erişemez. Kurum hesabı silinmez — ad, e-posta ve parola kimlik
            sağlayıcıdadır. Dizin eşitlemesi açıksa üyelikler bir sonraki eşitlemede geri gelebilir.
          </p>
          <p className="text-xs leading-5 text-muted-foreground">
            Kullanıcının geçmişte yaptığı işlemler denetim kayıtlarında kalır; bu işlem onları silmez.
          </p>
          {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Vazgeç</DialogClose>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => void revoke()}>
            {pending ? "Siliniyor…" : "Evet, erişimini sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
