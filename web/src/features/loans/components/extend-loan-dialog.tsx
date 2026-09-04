"use client";

import { useState } from "react";
import { Calendar, Clock, Plus } from "lucide-react";
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

export function ExtendLoanDialog({
  loan,
  onExtended,
}: {
  loan: LoanDetailsItem;
  onExtended: (loanId: string, newDueDate: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const calculateNewDate = (days: number) => {
    const base = new Date(loan.dueAt);
    base.setDate(base.getDate() + days);
    return base.toISOString().slice(0, 10);
  };

  const [additionalDays, setAdditionalDays] = useState(15);
  const [newDueDate, setNewDueDate] = useState(calculateNewDate(15));
  const [reason, setReason] = useState("Bilirkişi inceleme süresinin mahkemece uzatılması nedeniyle.");

  function handleDays(days: number) {
    setAdditionalDays(days);
    setNewDueDate(calculateNewDate(days));
  }

  async function handleConfirmExtension() {
    setIsPending(true);
    try {
      onExtended(loan.id, `${newDueDate}T17:00:00Z`);
      toast.success(`'${loan.folderBarcode}' için iade süresi ${newDueDate} tarihine uzatıldı.`);
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Süre uzatılırken hata oluştu.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-1 text-xs" title="Süre Uzat">
            <Clock className="size-3" />
            <span>Süre Uzat</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Clock className="size-5" />
            <DialogTitle>Ödünç Süre Uzatma Talebi</DialogTitle>
          </div>
          <DialogDescription className="text-left text-xs pt-1">
            Zimmet süresi biten veya devam eden dosya için ek süre tahsisi.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-1 text-xs">
          <div className="rounded-xl border border-border bg-muted/20 p-3 flex flex-col gap-1">
            <span className="font-mono text-[11px] font-bold text-primary">{loan.folderBarcode}</span>
            <span className="font-semibold text-foreground">{loan.folderTitle}</span>
            <span className="text-[11px] text-muted-foreground">
              Mevcut İade Tarihi: {new Date(loan.dueAt).toLocaleDateString("tr-TR")}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Ek Süre Seçimi</Label>
            <div className="flex items-center gap-2">
              {[
                { days: 7, label: "+7 Gün" },
                { days: 15, label: "+15 Gün" },
                { days: 30, label: "+30 Gün" },
              ].map((item) => (
                <button
                  key={item.days}
                  type="button"
                  onClick={() => handleDays(item.days)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    additionalDays === item.days
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "border border-border bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ext-date">Yeni İade Taahhüt Tarihi</Label>
            <Input
              id="ext-date"
              type="date"
              value={newDueDate}
              onChange={(e) => {
                setNewDueDate(e.target.value);
                setAdditionalDays(0);
              }}
              className="text-xs font-bold"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ext-reason">Süre Uzatma Gerekçesi</Label>
            <textarea
              id="ext-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-lg border border-border bg-card p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
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
            onClick={handleConfirmExtension}
            disabled={isPending}
            className="bg-primary text-primary-foreground gap-1.5"
          >
            Süreyi Uzat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
