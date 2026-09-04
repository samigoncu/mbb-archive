"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addFilePlanItem } from "@/features/classification/api/add-file-plan-item";
import type { FilePlanNode } from "@/features/classification/model/classification";

export function AddFilePlanNodeDialog({
  planId,
  nodes,
  defaultParentId = null,
  onNodeAdded,
  triggerLabel = "Yeni Konu Kodu Ekle",
  buttonSize = "default",
  variant = "default",
}: {
  planId: string;
  nodes: FilePlanNode[];
  defaultParentId?: string | null;
  onNodeAdded: (newNode: FilePlanNode) => void;
  triggerLabel?: string;
  buttonSize?: "default" | "sm" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const [parentId, setParentId] = useState<string>(defaultParentId ?? "");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<number>(3);
  const [isSelectable, setIsSelectable] = useState(true);

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) {
      setParentId(defaultParentId ?? "");
      // Otomatik seviye belirle
      if (defaultParentId) {
        const p = nodes.find((n) => n.id === defaultParentId);
        if (p) {
          setLevel(Math.min(12, p.level + 1));
          setCode(`${p.code}.`);
        }
      } else {
        setLevel(1);
        setCode("");
      }
      setTitle("");
      setIsSelectable(true);
    }
  }

  function handleParentChange(newParentId: string) {
    setParentId(newParentId);
    if (newParentId) {
      const p = nodes.find((n) => n.id === newParentId);
      if (p) {
        setLevel(Math.min(12, p.level + 1));
        if (!code || code.startsWith(p.code)) {
          setCode(`${p.code}.`);
        }
      }
    } else {
      setLevel(1);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !title.trim()) {
      toast.error("Lütfen kod ve başlık alanlarını doldurun.");
      return;
    }

    setIsPending(true);
    try {
      const res = await addFilePlanItem(planId, {
        parentId: parentId ? parentId : null,
        code: code.trim(),
        title: title.trim(),
        level: Number(level) || 1,
        isSelectable,
      });

      const newNode: FilePlanNode = {
        id: res.id,
        parentId: parentId ? parentId : null,
        code: code.trim(),
        title: title.trim(),
        level: Number(level) || 1,
        isSelectable,
        isActive: true,
      };

      onNodeAdded(newNode);
      toast.success(`'${code.trim()} - ${title.trim()}' başarıyla eklendi.`);
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Konu kodu eklenirken bir hata oluştu.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size={buttonSize} variant={variant} className="gap-1.5" />
        }
      >
        <Plus className="size-4" aria-hidden />
        {buttonSize !== "icon" ? <span>{triggerLabel}</span> : null}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Konu Kodu / Tasnif Düğümü</DialogTitle>
          <DialogDescription>
            Standart dosya planı hiyerarşisine yeni ana grup, alt grup veya konu kodu ekleyin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="parent-select">Üst Tasnif Kodu (Parent)</Label>
            <select
              id="parent-select"
              value={parentId}
              onChange={(e) => handleParentChange(e.target.value)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">-- Kök Düğüm (Ana Grup / Seviye 1) --</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.code} - {n.title} (Seviye {n.level})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="node-code">Tasnif / Konu Kodu</Label>
              <Input
                id="node-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Örn: 805.01.03"
                className="font-mono text-xs"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="node-level">Seviye</Label>
              <Input
                id="node-level"
                type="number"
                min={1}
                max={12}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="node-title">Konu Başlığı</Label>
            <Input
              id="node-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: İmar Plan Tadilatları ve Revizyon Talepleri"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isSelectable"
              checked={isSelectable}
              onChange={(e) => setIsSelectable(e.target.checked)}
              className="size-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="isSelectable" className="cursor-pointer font-medium text-xs">
              Bu koda evrak veya klasör açılabilir (Yaprak düğüm)
            </Label>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Ekleniyor…" : "Kodu Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
