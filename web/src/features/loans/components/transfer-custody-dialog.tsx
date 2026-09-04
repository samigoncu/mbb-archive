"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  Building2,
  Calendar,
  Check,
  FileText,
  MapPin,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
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
import { transferCustody } from "@/features/loans/api/transfer-custody";
import type { CustodyTransferRecord, LoanDetailsItem } from "@/features/loans/model/loan";

const PRESET_STAFF = [
  { name: "Veyis AYDEMİR", unit: "1. Hukuk Müşavirliği", location: "Hukuk Müşavirliği Kat: 3 Oda: 308" },
  { name: "Mehmet KAYA", unit: "İmar ve Şehircilik Dairesi", location: "İmar Dairesi Kat: 2 Oda: 214" },
  { name: "Fatma ŞAHİN", unit: "Harita ve CBS Şube Md.", location: "Harita Şb. Kat: 2 Oda: 215" },
  { name: "Ali ÇELİK", unit: "Fen İşleri Dairesi", location: "Fen İşleri Binası Kat: 1 Oda: 105" },
  { name: "Zeynep DEMİR", unit: "Yazı İşleri ve Kararlar", location: "Ana Hizmet Binası Kat: 4 Oda: 402" },
  { name: "Hakan YILDIZ", unit: "Mali Hizmetler Dairesi", location: "Mali Hizmetler Kat: 1 Oda: 110" },
];

export function TransferCustodyDialog({
  loan,
  onTransferred,
}: {
  loan: LoanDetailsItem;
  onTransferred: (
    loanId: string,
    record: CustodyTransferRecord,
    newHolder: string,
    newLocation: string,
    newDueAt?: string
  ) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const currentHolder = loan.currentHolder || loan.borrowerSubjectId;
  const currentLocation = loan.currentLocation || "İlgili Birim Arşivi";

  const [toUser, setToUser] = useState("Veyis AYDEMİR (1. Hukuk Müşavirliği)");
  const [location, setLocation] = useState("Hukuk Müşavirliği Kat: 3 Oda: 308");
  const [reason, setReason] = useState(
    "Duruşma hazırlığı ve ortak hukuki mütalaa incelemesi amacıyla dosya devredilmiştir."
  );
  const [officialDocNo, setOfficialDocNo] = useState("E-94285142-640-1092");
  const [newDueDate, setNewDueDate] = useState(
    loan.dueAt ? loan.dueAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );

  function handleSelectPreset(preset: (typeof PRESET_STAFF)[0]) {
    setToUser(`${preset.name} (${preset.unit})`);
    setLocation(preset.location);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toUser.trim()) {
      toast.error("Lütfen devredilecek personeli belirtin.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Lütfen devir gerekçesini belirtin.");
      return;
    }

    setIsPending(true);
    try {
      const record = await transferCustody({
        loanId: loan.id,
        fromUser: currentHolder,
        toUser: toUser.trim(),
        transferredAt: new Date().toISOString(),
        reason: reason.trim(),
        location: location.trim(),
        officialDocNo: officialDocNo.trim() || undefined,
        newDueAt: newDueDate ? `${newDueDate}T17:00:00Z` : undefined,
      });

      onTransferred(
        loan.id,
        record,
        toUser.trim(),
        location.trim(),
        newDueDate ? `${newDueDate}T17:00:00Z` : undefined
      );

      toast.success(
        `Dosya zimmeti '${toUser}' personeline devredildi. Zincirleme zimmet kaydı güncellendi.`
      );
      setIsOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Zimmet devri sırasında bir hata oluştu.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 text-xs gap-1"
            title="Dosyayı Kurum İçinde Başka Personele Devret (Zincirleme Zimmet)"
          >
            <ArrowLeftRight className="size-3" />
            <span>Zimmet Devret</span>
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
              <ArrowLeftRight className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Zimmet Devri (Zincirleme Kurum İçi Devir)
              </DialogTitle>
              <DialogDescription className="text-xs">
                Ödünçteki dosya, kurum içinde başka bir personele uygulama üzerinden resmi olarak devredilir.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 py-2 text-xs">
          {/* Mevcut Durum Kartı */}
          <div className="rounded-xl border border-border bg-muted/40 p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground truncate">{loan.folderTitle}</span>
              <span className="font-mono text-[10px] text-primary font-bold">{loan.folderBarcode}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border mt-1">
              <div>
                <span className="text-muted-foreground block text-[10px]">Mevcut Dosya Hamili:</span>
                <strong className="text-foreground">{currentHolder}</strong>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Mevcut Konum:</span>
                <strong className="text-foreground">{currentLocation}</strong>
              </div>
            </div>
            {loan.custodyChain && loan.custodyChain.length > 0 && (
              <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold pt-1 border-t border-border flex items-center gap-1">
                <span>⛓️ Bu dosya daha önce {loan.custodyChain.length} kez kurum içinde devredilmiştir.</span>
              </div>
            )}
          </div>

          {/* Hızlı Personel Seçimi */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              Hızlı Personel / Birim Seçimi:
            </Label>
            <div className="flex flex-wrap gap-1">
              {PRESET_STAFF.map((staff) => (
                <button
                  key={staff.name}
                  type="button"
                  onClick={() => handleSelectPreset(staff)}
                  className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted hover:border-primary transition-colors"
                >
                  {staff.name} ({staff.unit.split(" ")[0]})
                </button>
              ))}
            </div>
          </div>

          {/* Devredilecek Personel */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to-user" className="font-bold">
              Devredilecek Personel (Ad Soyad & Birim / Sicil) *
            </Label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="to-user"
                value={toUser}
                onChange={(e) => setToUser(e.target.value)}
                placeholder="Örn: Veyis AYDEMİR (1. Hukuk Müşavirliği)"
                className="pl-8.5 text-xs font-semibold"
                required
              />
            </div>
          </div>

          {/* Yeni Bulunduğu Yer / Oda */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to-location" className="font-bold">
              Yeni Bulunduğu Yer / Oda / Masa *
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="to-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Örn: Hukuk Müşavirliği Kat: 3 Oda: 308"
                className="pl-8.5 text-xs"
                required
              />
            </div>
          </div>

          {/* Resmi Yazı / Onay No & İade Tarihi */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doc-no" className="font-medium">
                Resmi Devir Üst Yazı No
              </Label>
              <Input
                id="doc-no"
                value={officialDocNo}
                onChange={(e) => setOfficialDocNo(e.target.value)}
                placeholder="E-94285142-640-..."
                className="font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-due-date" className="font-medium">
                Yeni Son İade Tarihi
              </Label>
              <Input
                id="new-due-date"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="text-xs font-bold"
              />
            </div>
          </div>

          {/* Devir Gerekçesi */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason" className="font-bold">
              Zimmet Devir Gerekçesi / Açıklama *
            </Label>
            <textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Dosyanın diğer personele devredilme nedeni, dava esas no veya ortak çalışma detayı..."
              className="rounded-lg border border-border bg-background p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 p-2.5 text-[11px] text-indigo-700 dark:text-indigo-300">
            <strong>Yasal Uyarı (Devlet Arşiv Hizmetleri Yönetmeliği):</strong> Zimmet devri tamamlandığında
            arşiv sistemindeki dosya hamili güncellenir. Dosyanın fiziki korunması ve süresi içinde kuruma iadesinden
            yeni devralan personel müştereken ve müteselsilen sorumludur.
          </div>

          <DialogFooter className="border-t border-border pt-3 mt-1">
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
              type="submit"
              size="sm"
              disabled={isPending}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              <Check className="size-3.5" />
              {isPending ? "Devrediliyor…" : "Zimmet Devrini Onayla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
