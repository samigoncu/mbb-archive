"use client";

import { useState } from "react";
import { Pencil, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  deleteFilePlanItemAction,
  setFilePlanItemActiveAction,
  updateFilePlanItemAction,
  type FilePlanActionResult,
} from "@/features/classification/api/file-plan-actions";
import type { FilePlanNode } from "@/features/classification/model/classification";

/**
 * Seçili konu kodu üzerindeki düzeltme işlemleri.
 *
 * <para>
 * Kod alanı yok: belgeler, dijital dosyalar, fiziksel klasörler ve birim–SDP
 * atamaları koda göre bağlanır, kodu düzenletmek bu bağları sessizce koparırdı.
 * Yanlış kod pasife alınır ve doğrusu açılır.
 * </para>
 */
export function FilePlanNodeActions({ planId, node, hasChildren, onChanged }: {
  planId: string;
  node: FilePlanNode;
  hasChildren: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  const [title, setTitle] = useState(node.title);
  const [description, setDescription] = useState(node.description ?? "");
  const [isSelectable, setIsSelectable] = useState(node.isSelectable);

  async function run(key: string, work: () => Promise<FilePlanActionResult>, success: string, close?: () => void) {
    if (pending) return;
    setPending(key); setError("");
    const result = await work();
    setPending("");
    if (result.error) { setError(result.error); return; }
    toast.success(success);
    close?.();
    onChanged();
  }

  return <>
    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
      <Button type="button" size="sm" variant="outline" onClick={() => {
        setTitle(node.title); setDescription(node.description ?? ""); setIsSelectable(node.isSelectable);
        setError(""); setEditing(true);
      }}>
        <Pencil className="size-4" aria-hidden />Düzenle
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={!!pending}
        onClick={() => void run("active", () => setFilePlanItemActiveAction(planId, node.id, !node.isActive),
          node.isActive ? "Konu kodu pasife alındı." : "Konu kodu yeniden yürürlüğe alındı.")}>
        <Power className="size-4" aria-hidden />
        {node.isActive ? "Pasife al" : "Yeniden aç"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => { setError(""); setRemoving(true); }}>
        <Trash2 className="size-4" aria-hidden />Kaldır
      </Button>
    </div>

    {error && !editing && !removing && (
      <p role="alert" className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs leading-5 text-destructive">{error}</p>
    )}

    <Dialog open={editing} onOpenChange={setEditing}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Konu kodunu düzenle</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{node.code}</span> · {node.level}. seviye. Kod değiştirilemez;
            belgeler ve dosyalar bu koda bağlıdır.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={event => {
          event.preventDefault();
          void run("edit", () => updateFilePlanItemAction(planId, node.id, {
            title, description: description || null, isSelectable,
          }), "Konu kodu güncellendi.", () => setEditing(false));
        }}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="node-edit-title">Konu başlığı</Label>
            <Input id="node-edit-title" value={title} required maxLength={300}
              onChange={event => setTitle(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="node-edit-description">Açıklama</Label>
            <Input id="node-edit-description" value={description} maxLength={1000}
              placeholder="İsteğe bağlı"
              onChange={event => setDescription(event.target.value)} />
          </div>
          <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3">
            <input type="checkbox" checked={isSelectable} className="mt-0.5 size-4 shrink-0"
              onChange={event => setIsSelectable(event.target.checked)} />
            <span className="text-sm">
              <span className="block font-medium">Bu koda dosya açılabilir</span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                Yalnız gruplama amaçlı ara başlıklarda işareti kaldırın.
              </span>
            </span>
          </label>
          {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>İptal</DialogClose>
            <Button type="submit" disabled={!!pending}>{pending === "edit" ? "Kaydediliyor…" : "Kaydet"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={removing} onOpenChange={setRemoving}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle><span className="font-mono">{node.code}</span> · {node.title}</DialogTitle>
          <DialogDescription>{node.level}. seviye konu kodu</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {hasChildren
            ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Bu kodun altında başka konular var. Önce onları kaldırın ya da kodu pasife alın.
              </p>
            : <p className="text-xs leading-5 text-muted-foreground">
                Silme yalnız hiç kullanılmamış kodda mümkündür. Koda bağlı belge, dijital dosya,
                fiziksel klasör ya da birim ataması varsa sunucu reddeder ve sebebini söyler.
                Kullanımdan çıkarmanın güvenli yolu pasife almaktır: kayıtların geçmişi korunur.
              </p>}
          {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Vazgeç</DialogClose>
          <Button type="button" variant="outline" disabled={!!pending}
            onClick={() => void run("active", () => setFilePlanItemActiveAction(planId, node.id, !node.isActive),
              node.isActive ? "Konu kodu pasife alındı." : "Konu kodu yeniden yürürlüğe alındı.",
              () => setRemoving(false))}>
            <Power className="size-4" aria-hidden />
            {node.isActive ? "Pasife al" : "Yeniden aç"}
          </Button>
          {!hasChildren && <Button type="button" variant="destructive" disabled={!!pending}
            onClick={() => void run("delete", () => deleteFilePlanItemAction(planId, node.id),
              "Konu kodu silindi.", () => setRemoving(false))}>
            {pending === "delete" ? "Siliniyor…" : "Kalıcı olarak sil"}
          </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
