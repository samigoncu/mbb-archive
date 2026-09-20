"use client";

import { useActionState, useEffect, useState } from "react";
import { Gavel, ShieldAlert, CheckCircle2, Layers } from "lucide-react";
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
import { bulkDeclareArchiveRecordsAction } from "@/features/archive/api/declare-record-action";
import type { FilePlanNode } from "@/features/classification/model/classification";
import type { RetentionRuleListItem } from "@/features/retention/model/retention";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

const fieldClass =
  "h-9 w-full rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const initialState: ActionState = { status: "idle" };

export function BulkDeclareDialog({
  recordIds,
  filePlanItems,
  retentionRules,
  onCompleted,
}: {
  recordIds: string[];
  filePlanItems: FilePlanNode[];
  retentionRules: RetentionRuleListItem[];
  onCompleted?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    bulkDeclareArchiveRecordsAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Toplu beyan tamamlandı.");
      setIsOpen(false);
      onCompleted?.();
    }

    if (state.status === "error") {
      toast.error(state.message ?? "Toplu kayıt beyanı tamamlanamadı.");
    }
  }, [state, onCompleted]);

  const canDeclare =
    recordIds.length > 0 &&
    filePlanItems.length > 0 &&
    retentionRules.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            disabled={recordIds.length === 0}
            className="gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs"
          />
        }
      >
        <Gavel className="size-3.5" aria-hidden />
        Toplu Beyan Et ({recordIds.length})
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Layers className="size-4" />
            </span>
            <DialogTitle className="text-base font-bold">
              Toplu Kurumsal Kayıt Beyanı
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Seçilen <strong>{recordIds.length} adet</strong> aday belge tek seferde kurumsal arşiv kaydı olarak tescil edilecektir.
          </DialogDescription>
        </DialogHeader>

        <Notice tone="warning" icon={ShieldAlert}>
          Toplu beyan işlemi tek yönlüdür ve geri alınamaz. Seçilen tüm belgelerin
          SHA-256 kriptografik özeti mühürlenecek, içerik değişikliğe kapatılacak ve
          saklama/tasfiye takvimi başlatılacaktır.
        </Notice>

        {canDeclare ? (
          <form action={formAction} className="flex flex-col gap-4 text-xs">
            <input type="hidden" name="recordIds" value={recordIds.join(",")} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bulk-classification" className="font-semibold">
                Standart Dosya Planı (SDP) Kalemi <span className="text-destructive">*</span>
              </Label>
              <select
                id="bulk-classification"
                name="classificationCode"
                className={fieldClass}
                required
              >
                <option value="">— Tüm seçilenler için SDP kodu seçin —</option>
                {filePlanItems.map((item) => (
                  <option key={item.id} value={item.code}>
                    {item.code} · {item.title}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Seçilen tüm aday belgelere bu dosya planı konusu atanacaktır.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bulk-retention" className="font-semibold">
                Saklama Kuralı <span className="text-destructive">*</span>
              </Label>
              <select
                id="bulk-retention"
                name="retentionRuleCode"
                className={fieldClass}
                required
              >
                <option value="">— Tüm seçilenler için saklama kuralı seçin —</option>
                {retentionRules.map((rule) => (
                  <option key={rule.id} value={rule.code}>
                    {rule.code} · {rule.name} ({rule.retentionMonths} ay)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Beyan anından itibaren bu kuralın saklama ve tasfiye süresi işlemeye başlar.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
              <span>Etkilenecek Belge Sayısı: </span>
              <strong className="text-foreground font-semibold">{recordIds.length} belge</strong>
            </div>

            <DialogFooter className="mt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="text-xs"
              >
                Vazgeç
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs font-semibold"
              >
                <CheckCircle2 className="size-3.5" />
                {isPending ? "Kayıtlar Beyan Ediliyor…" : `Seçilen ${recordIds.length} Belgeyi Beyan Et`}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">
            Beyan edilecek kayıt seçilmedi veya sistemde tanımlı dosya planı/saklama kuralı bulunmuyor.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

