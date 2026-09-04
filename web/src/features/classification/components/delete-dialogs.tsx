"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteFilePlan } from "@/features/classification/api/delete-file-plan";
import { deleteFilePlanItem } from "@/features/classification/api/delete-file-plan-item";
import type { FilePlanNode } from "@/features/classification/model/classification";

export function DeleteFilePlanDialog({
  planId,
  planCode,
  planName,
  onPlanDeleted,
}: {
  planId: string;
  planCode: string;
  planName: string;
  onPlanDeleted: (deletedId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    setIsPending(true);
    try {
      await deleteFilePlan(planId);
      onPlanDeleted(planId);
      toast.success(`'${planName}' dosya planı başarıyla silindi.`);
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Plan silinirken hata oluştu.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5" />
        }
      >
        <Trash2 className="size-3.5" aria-hidden />
        Planı Sil
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <DialogTitle>Dosya Planını Sil</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2">
            <strong>{planCode} - {planName}</strong> standart dosya planı ve altındaki tüm tasnif kodları kalıcı olarak silinecektir.
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-border">
          Uyarı: Bu işlem geri alınamaz. Bu plana bağlı evrakların tasnif kodları etkilenebilir.
        </p>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            İptal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Siliniyor…" : "Evet, Planı Sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteNodeDialog({
  planId,
  node,
  allNodes,
  onNodeDeleted,
  buttonVariant = "ghost",
  buttonSize = "sm",
}: {
  planId: string;
  node: FilePlanNode;
  allNodes: FilePlanNode[];
  onNodeDeleted: (deletedIds: string[]) => void;
  buttonVariant?: "default" | "outline" | "ghost" | "destructive";
  buttonSize?: "default" | "sm" | "icon";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Alt çocukları bul
  function findDescendantIds(parentId: string): string[] {
    const children = allNodes.filter((n) => n.parentId === parentId);
    let ids = children.map((c) => c.id);
    for (const child of children) {
      ids = ids.concat(findDescendantIds(child.id));
    }
    return ids;
  }

  const childIds = findDescendantIds(node.id);
  const totalToDelete = 1 + childIds.length;

  async function handleDelete() {
    setIsPending(true);
    try {
      await deleteFilePlanItem(planId, node.id);
      onNodeDeleted([node.id, ...childIds]);
      toast.success(`'${node.code} - ${node.title}' tasnif kodu silindi.`);
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Tasnif kodu silinirken hata oluştu.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            variant={buttonVariant}
            size={buttonSize}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
            title="Tasnif Kodunu Sil"
          />
        }
      >
        <Trash2 className="size-3.5" aria-hidden />
        {buttonSize !== "icon" ? <span>Kodu Sil</span> : null}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <DialogTitle>Tasnif Kodunu Sil</DialogTitle>
          </div>
          <DialogDescription className="text-left pt-2">
            <span className="font-mono font-bold text-foreground">{node.code}</span> -{" "}
            <strong>{node.title}</strong> tasnif kodunu silmek istediğinize emin misiniz?
          </DialogDescription>
        </DialogHeader>

        {childIds.length > 0 ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex flex-col gap-1">
            <span className="font-bold flex items-center gap-1">
              <AlertTriangle className="size-3.5" /> Dikkat: Alt Düğümler Mevcut!
            </span>
            <span>
              Bu tasnif koduna bağlı <strong>{childIds.length}</strong> adet alt konu kodu da silinecektir.
            </span>
          </div>
        ) : null}

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            İptal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Siliniyor…" : "Evet, Kodu Sil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
