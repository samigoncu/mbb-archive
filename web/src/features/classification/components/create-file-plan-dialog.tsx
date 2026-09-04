"use client";

import { useState } from "react";
import { FolderPlus } from "lucide-react";
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
import { createFilePlan } from "@/features/classification/api/create-file-plan";
import type { FilePlanListItem } from "@/features/classification/model/classification";

export function CreateFilePlanDialog({
  onPlanCreated,
}: {
  onPlanCreated: (newPlan: FilePlanListItem) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const [code, setCode] = useState("MBB-SDP-2026");
  const [name, setName] = useState("Malatya B.Ş.B. Standart Dosya Planı 2026");
  const [version, setVersion] = useState("v2.6");
  const [authority, setAuthority] = useState("Devlet Arşivleri Başkanlığı & MBB Meclisi");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error("Lütfen kod ve plan adı alanlarını doldurun.");
      return;
    }

    setIsPending(true);
    try {
      const res = await createFilePlan({
        code: code.trim(),
        name: name.trim(),
        version: version.trim(),
        authority: authority.trim(),
        effectiveFrom,
      });

      const newPlan: FilePlanListItem = {
        id: res.id,
        code: code.trim(),
        name: name.trim(),
        version: version.trim(),
        authority: authority.trim(),
        effectiveFrom,
        effectiveTo: null,
        isActive: true,
        itemCount: 0,
      };

      onPlanCreated(newPlan);
      toast.success("Dosya planı başarıyla oluşturuldu.");
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Dosya planı oluşturulurken hata oluştu.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <FolderPlus className="size-4" aria-hidden />
        Yeni Dosya Planı
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Standart Dosya Planı</DialogTitle>
          <DialogDescription>
            Kurum genelinde uygulanacak yeni tasnif ve dosya planı tanımı.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fp-code">Plan Kodu</Label>
            <Input
              id="fp-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Örn: MBB-SDP-2026"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fp-name">Plan Adı / Tanımı</Label>
            <Input
              id="fp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Malatya B.Ş.B. Standart Dosya Planı 2026"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fp-version">Sürüm</Label>
              <Input
                id="fp-version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v2.6"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fp-from">Yürürlük Tarihi</Label>
              <Input
                id="fp-from"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fp-auth">Yürürlük Makamı</Label>
            <Input
              id="fp-auth"
              value={authority}
              onChange={(e) => setAuthority(e.target.value)}
              placeholder="Devlet Arşivleri Başkanlığı"
              required
            />
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
              {isPending ? "Oluşturuluyor…" : "Planı Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
