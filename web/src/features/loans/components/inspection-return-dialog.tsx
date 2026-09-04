"use client";

import { useState } from "react";
import { Check, CheckCircle2, FileCheck, RotateCcw, ShieldCheck } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import type { LoanDetailsItem } from "@/features/loans/model/loan";

export function InspectionReturnDialog({
  loan,
  onReturned,
}: {
  loan: LoanDetailsItem;
  onReturned: (loanId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const [hasCheckedPages, setHasCheckedPages] = useState(true);
  const [hasNoDamage, setHasNoDamage] = useState(true);
  const [receiverName, setReceiverName] = useState("Ahmet Yılmaz (Arşiv Sorumlusu)");
  const [notes, setNotes] = useState("Dosya eksiksiz ve yıpranmasız teslim alınmıştır.");

  async function handleConfirmReturn() {
    if (!hasCheckedPages || !hasNoDamage) {
      if (!confirm("Fiziksel kontrol onay kutuları işaretlenmedi. Yine de hasarlı/eksik olarak iade almak istiyor musunuz?")) {
        return;
      }
    }

    setIsPending(true);
    try {
      // Return loan API call simulated / performed
      onReturned(loan.id);
      toast.success(`'${loan.folderBarcode}' dosyası eksiksiz teslim alındı ve rafa yerleştirildi.`);
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "İade alınırken hata oluştu.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-800 gap-1">
            <CheckCircle2 className="size-3.5" />
            <span>İade Al</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600">
            <ShieldCheck className="size-5" />
            <DialogTitle>Kontrollü Arşiv İade Süreci</DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs pt-1">
            Dosya rafa kaldırılmadan önce sayfa bütünlüğü ve fiziksel durum kontrolü yapılmalıdır.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1 text-xs">
          <div className="rounded-xl border border-border bg-muted/20 p-3 flex flex-col gap-1">
            <span className="font-mono text-[11px] font-bold text-primary">{loan.folderBarcode}</span>
            <span className="font-semibold text-foreground">{loan.folderTitle}</span>
            <span className="text-[11px] text-muted-foreground">Teslim Eden: {loan.borrowerSubjectId}</span>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
            <span className="font-bold text-foreground">Fiziksel Kontrol Kriterleri</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasCheckedPages}
                onChange={(e) => setHasCheckedPages(e.target.checked)}
                className="size-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-medium text-foreground">Evrak ve ek paftalar eksiksiz kontrol edildi</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasNoDamage}
                onChange={(e) => setHasNoDamage(e.target.checked)}
                className="size-4 rounded border-border text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-medium text-foreground">Fiziksel yıpranma, kopma veya leke bulunmuyor</span>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="receiver-name">İadeyi Alan Arşiv Yetkilisi</Label>
            <Input
              id="receiver-name"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return-notes">İade Açıklaması / Teslim Notu</Label>
            <Input
              id="return-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            İptal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmReturn}
            disabled={isPending}
            className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
          >
            <Check className="size-3.5" />
            {isPending ? "İşleniyor…" : "İadeyi Onayla & Rafa Kaldır"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
