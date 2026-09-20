"use client";

import { useActionState, useEffect, useState } from "react";
import { Gavel } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/page";
import { declareArchiveRecordAction } from "@/features/archive/api/declare-record-action";
import type { ArchiveRecordListItem } from "@/features/archive/model/archive-record";
import type { FilePlanNode } from "@/features/classification/model/classification";
import type { RetentionRuleListItem } from "@/features/retention/model/retention";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

const fieldClass =
  "h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const initialState: ActionState = { status: "idle" };

/**
 * Beyan tek yönlüdür; bu yüzden onay kutusu değil, ayrı bir diyalog ve açık bir
 * uyarı kullanılır. Kodlar serbest metin olarak girilmez — yalnızca tanımlı
 * dosya planı kalemleri ve saklama kuralları seçilebilir.
 */
export function DeclareRecordDialog({
  record,
  filePlanItems,
  retentionRules,
}: {
  record: ArchiveRecordListItem;
  filePlanItems: FilePlanNode[];
  retentionRules: RetentionRuleListItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    declareArchiveRecordAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Kayıt beyan edildi.");
      setIsOpen(false);
    }

    if (state.status === "error") {
      toast.error(state.message ?? "Kayıt beyanı tamamlanamadı.");
    }
  }, [state]);

  const canDeclare = filePlanItems.length > 0 && retentionRules.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Gavel className="size-3.5" aria-hidden />
        Beyan Et
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kurumsal Kayıt Beyanı</DialogTitle>
          <DialogDescription>
            Belge sürümü {record.documentVersionId.slice(0, 8)}… kurumsal kayıt
            olarak beyan edilecek.
          </DialogDescription>
        </DialogHeader>

        <Notice tone="warning">
          Beyan geri alınamaz. Kayıt değişmez hâle gelir ve seçilen saklama
          kuralına göre imha/devir takvimi işlemeye başlar.
        </Notice>

        {canDeclare ? (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="recordId" value={record.id} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`classification-${record.id}`}>
                Dosya planı kalemi
              </Label>
              <select
                id={`classification-${record.id}`}
                name="classificationCode"
                className={fieldClass}
                required
              >
                <option value="">— Seçin —</option>
                {filePlanItems.map((item) => (
                  <option key={item.id} value={item.code}>
                    {item.code} · {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`retention-${record.id}`}>Saklama kuralı</Label>
              <select
                id={`retention-${record.id}`}
                name="retentionRuleCode"
                className={fieldClass}
                required
              >
                <option value="">— Seçin —</option>
                {retentionRules.map((rule) => (
                  <option key={rule.id} value={rule.code}>
                    {rule.code} · {rule.name} ({rule.retentionMonths} ay)
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
              >
                Vazgeç
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Beyan ediliyor…" : "Kaydı Beyan Et"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <Notice>
            Beyan için en az bir seçilebilir dosya planı kalemi ve bir saklama
            kuralı tanımlı olmalıdır. Bunları{" "}
            <strong>Tanımlamalar</strong> ekranından ekleyebilirsiniz.
          </Notice>
        )}
      </DialogContent>
    </Dialog>
  );
}
