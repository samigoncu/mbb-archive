"use client";

import { useActionState, useEffect, useState } from "react";
import { Gavel, ShieldCheck, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/ui/page";
import { declareArchiveRecordAction } from "@/features/archive/api/declare-record-action";
import { getDeclarationOptionsAction } from "@/features/archive/api/get-declaration-options-action";
import type { FilePlanNode } from "@/features/classification/model/classification";
import type { RetentionRuleListItem } from "@/features/retention/model/retention";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

const fieldClass =
  "h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const initialState: ActionState = { status: "idle" };

export interface PostUploadDeclareDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  recordId?: string;
  initialClassificationCode?: string;
  onDeclared?: () => void;
}

export function PostUploadDeclareDialog({
  isOpen,
  onOpenChange,
  documentId,
  documentTitle,
  recordId,
  initialClassificationCode,
  onDeclared,
}: PostUploadDeclareDialogProps) {
  const [filePlanItems, setFilePlanItems] = useState<FilePlanNode[]>([]);
  const [retentionRules, setRetentionRules] = useState<RetentionRuleListItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedClassification, setSelectedClassification] = useState(initialClassificationCode ?? "");
  const [selectedRetention, setSelectedRetention] = useState("");

  const [state, formAction, isPending] = useActionState(
    declareArchiveRecordAction,
    initialState,
  );

  useEffect(() => {
    if (initialClassificationCode) {
      setSelectedClassification(initialClassificationCode);
    }
  }, [initialClassificationCode]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoadingOptions(true);

    getDeclarationOptionsAction()
      .then((opts) => {
        if (cancelled) return;
        setFilePlanItems(opts.filePlanItems);
        setRetentionRules(opts.retentionRules);
        // Varsayılan saklama kuralı olarak ilk kuralı veya uygun kuralı seçelim
        if (opts.retentionRules.length > 0 && !selectedRetention) {
          setSelectedRetention(opts.retentionRules[0].code);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Belge kurumsal arşiv kaydı olarak beyan edildi.");
      onOpenChange(false);
      onDeclared?.();
    }

    if (state.status === "error") {
      toast.error(state.message ?? "Kayıt beyanı tamamlanamadı.");
    }
  }, [state, onOpenChange, onDeclared]);

  const canSubmit = selectedClassification.trim() !== "" && selectedRetention.trim() !== "";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Kayıt Beyanı (Opsiyonel)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Yüklenen evrakı şimdi resmi kurumsal arşiv kaydı olarak tescil edebilirsiniz.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Yüklenen Belge:</p>
          <p className="text-sm font-semibold text-foreground break-words">{documentTitle || "İsimsiz Evrak"}</p>
        </div>

        <Notice tone="neutral">
          <strong>Kayıt Beyanı Nedir?</strong> Evrakı kurumsal kayıt statüsüne geçirir, dosya planı (SDP) ve saklama süresini mühürler. Bu adımı şimdi tamamlayabilir veya evrakı daha sonra <strong>Kayıt Beyanı</strong> menüsünden beyan edebilirsiniz.
        </Notice>

        {loadingOptions ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
            <Clock className="size-4 animate-spin" />
            Plan ve saklama kuralları yükleniyor…
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            {recordId ? (
              <input type="hidden" name="recordId" value={recordId} />
            ) : (
              <input type="hidden" name="documentId" value={documentId} />
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`post-upload-classification-${documentId}`} className="text-xs font-semibold">
                Standart Dosya Planı (SDP) Kodu <span className="text-destructive">*</span>
              </Label>
              <select
                id={`post-upload-classification-${documentId}`}
                name="classificationCode"
                className={fieldClass}
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                required
              >
                <option value="">— Dosya Planı Seçin —</option>
                {filePlanItems.map((item) => (
                  <option key={item.id} value={item.code}>
                    {item.code} · {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`post-upload-retention-${documentId}`} className="text-xs font-semibold">
                Saklama / İmha Kuralı <span className="text-destructive">*</span>
              </Label>
              <select
                id={`post-upload-retention-${documentId}`}
                name="retentionRuleCode"
                className={fieldClass}
                value={selectedRetention}
                onChange={(e) => setSelectedRetention(e.target.value)}
                required
              >
                <option value="">— Saklama Kuralı Seçin —</option>
                {retentionRules.map((rule) => (
                  <option key={rule.id} value={rule.code}>
                    {rule.code} · {rule.name} ({rule.retentionMonths} ay)
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="mt-3 flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Daha Sonra Beyan Et
              </Button>
              <Button
                type="submit"
                disabled={isPending || !canSubmit}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Gavel className="mr-1.5 size-4" />
                {isPending ? "Beyan ediliyor…" : "Resmi Kayıt Beyan Et"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
