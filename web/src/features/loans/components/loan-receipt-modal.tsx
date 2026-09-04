"use client";

import { Printer, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LoanDetailsItem } from "@/features/loans/model/loan";

export function LoanReceiptModal({
  loan,
  isOpen,
  onClose,
}: {
  loan: LoanDetailsItem | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!loan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
          <DialogTitle className="text-sm font-bold">Resmi Teslim-Tesellüm Tutanağı</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border-2 border-slate-900 bg-white text-slate-900 p-5 shadow-sm font-sans flex flex-col gap-2.5 text-xs">
          <div className="text-center border-b-2 border-slate-900 pb-2">
            <span className="font-black text-xs uppercase block">T.C. MALATYA BÜYÜKŞEHİR BELEDİYE BAŞKANLIĞI</span>
            <span className="font-extrabold text-[11px] block">ARŞİV VE DOKÜMANTASYON ŞUBE MÜDÜRLÜĞÜ</span>
            <span className="font-bold text-[10px] text-slate-600">ARŞİV BELGE / DOSYA TESLİM - TESELLÜM TUTANAĞI</span>
          </div>

          <div className="flex justify-between items-center text-[10px] border-b border-slate-200 pb-1 font-mono">
            <span>Tutanak No: <strong>TT-2026/{loan.id.slice(-4)}</strong></span>
            <span>Veriliş Tarihi: <strong>{new Date(loan.checkedOutAt).toLocaleDateString("tr-TR")}</strong></span>
          </div>

          <div className="flex flex-col gap-1 py-1 text-[11px] border-b border-slate-200">
            <div>Dosya Barkodu: <strong className="font-mono">{loan.folderBarcode}</strong></div>
            <div>Dosya Başlığı: <strong>{loan.folderTitle}</strong></div>
            <div>Tasnif (SDP): <strong className="font-mono">{loan.filePlanCode}</strong></div>
            <div>Teslim Alan: <strong>{loan.borrowerSubjectId}</strong></div>
            <div>Son İade Tarihi: <strong className="text-red-700">{new Date(loan.dueAt).toLocaleDateString("tr-TR")}</strong></div>
            <div>Gerekçe: <em>{loan.purpose}</em></div>
          </div>

          <p className="text-[9px] text-slate-600 leading-relaxed border-t border-slate-200 pt-2 text-justify">
            Yukarıda bilgileri yazılı arşiv dosyası/evrakı, Devlet Arşiv Hizmetleri Hakkında Yönetmelik hükümleri
            uyarınca sağlam ve eksiksiz teslim edilmiş olup, belirtilen sürede iade edileceği taahhüt edilmiştir.
          </p>

          <div className="flex justify-between items-end pt-5 text-[10px]">
            <div className="flex flex-col items-center text-center">
              <span className="font-bold">TESLİM EDEN</span>
              <span>Ahmet YILMAZ</span>
              <span className="text-[9px] text-slate-500">Arşiv Yetkilisi</span>
            </div>
            <div className="flex flex-col items-center">
              <QrCode className="size-10 text-slate-900" />
              <span className="font-mono text-[8px]">TT-2026-ONAY</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="font-bold">TESLİM ALAN</span>
              <span>{loan.borrowerSubjectId}</span>
              <span className="text-[9px] text-slate-500">İmza</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Kapat
          </Button>
          <Button size="sm" onClick={() => window.print()} className="gap-1.5 bg-primary text-primary-foreground">
            <Printer className="size-3.5" />
            Yazdır (A4 Tutanak)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
