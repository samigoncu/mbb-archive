"use client";

import { useActionState, useEffect, useState } from "react";
import { Undo2, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
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
import { returnLoanAction } from "@/features/loans/api/loan-actions";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

const initialState: ActionState = { status: "idle" };

const QUICK_NOTES = [
  "Eksiksiz ve hasarsız teslim alındı",
  "Kontrol edildi, arşive yerleştirildi",
  "Rutin iade işlemi tamamlandı",
];

export function ReturnLoanButton({
  loanId,
  folderBarcode,
  borrowerSubjectId,
  folderTitle,
  onReturned,
}: {
  loanId: string;
  folderBarcode: string;
  borrowerSubjectId?: string;
  folderTitle?: string;
  onReturned?: (returnNote: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, action, pending] = useActionState(returnLoanAction, initialState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message || "Dosya başarıyla iade alındı.");
      const currentNote = note;
      setOpen(false);
      setNote("");
      onReturned?.(currentNote);
    }

    if (state.status === "error") {
      toast.error(state.message || "İade alınamadı.");
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5"
            aria-label={`${folderBarcode} dosyasını iade al`}
          />
        }
      >
        <Undo2 className="size-3.5 text-primary" aria-hidden />
        <span>İade Al</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5 text-primary">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Undo2 className="size-4" aria-hidden />
            </span>
            <div>
              <DialogTitle className="text-base font-semibold">
                Fiziksel Dosya İadesi
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Ödünç / zimmet kaydını sonlandırıp klasörü fiziksel arşive iade alacaksınız.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Bilgi Kartı */}
        <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Dosya Barkodu:</span>
            <span className="font-mono font-semibold text-foreground">{folderBarcode}</span>
          </div>
          {folderTitle && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground shrink-0">Dosya Adı:</span>
              <span className="font-medium text-foreground truncate text-right">{folderTitle}</span>
            </div>
          )}
          {borrowerSubjectId && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Teslim Eden:</span>
              <span className="font-medium text-foreground">{borrowerSubjectId}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
            <span>Statü: &ldquo;Ödünçte&rdquo; ➔ &ldquo;Kullanılabilir (Arşivde)&rdquo; olarak güncellenecek</span>
          </div>
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="loanId" value={loanId} />

          <div className="space-y-1.5">
            <label
              htmlFor={`return-note-${loanId}`}
              className="text-xs font-medium text-foreground"
            >
              İade Açıklaması / Durum Notu (İsteğe bağlı)
            </label>
            <textarea
              id={`return-note-${loanId}`}
              name="returnNote"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Dosyanın fiziksel durumu ve teslim alınma açıklaması..."
              className="block w-full rounded-lg border border-input bg-background p-2.5 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />

            {/* Hızlı Şablonlar */}
            <div className="flex flex-wrap items-center gap-1 pt-1">
              <span className="text-[10px] text-muted-foreground">Hızlı Not:</span>
              {QUICK_NOTES.map((qn) => (
                <button
                  key={qn}
                  type="button"
                  onClick={() => setNote(qn)}
                  className="rounded border border-border/80 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
                >
                  + {qn}
                </button>
              ))}
            </div>
          </div>

          {state.message && (
            <p
              role={state.status === "error" ? "alert" : "status"}
              className={`text-xs ${
                state.status === "error"
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {state.message}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={pending}
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ShieldCheck className="size-3.5" aria-hidden />
              {pending ? "İşleniyor…" : "İadeyi Onayla ve Arşive Al"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
