"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Clock,
  FileCheck,
  FileSpreadsheet,
  FileText,
  History,
  MapPin,
  Printer,
  ShieldCheck,
  User,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import type { LoanDetailsItem } from "@/features/loans/model/loan";

export function CustodyChainDialog({
  loan,
  trigger,
}: {
  loan: LoanDetailsItem;
  trigger?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const chain = loan.custodyChain || [];
  const currentHolder = loan.currentHolder || loan.borrowerSubjectId;
  const currentLocation = loan.currentLocation || "Birim Arşivi";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          trigger ? (
            <>{trigger}</>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-indigo-600 hover:bg-indigo-500/10"
              title="Zincirleme Zimmet ve Devir Tarihçesini Görüntüle"
            >
              <History className="size-3.5" />
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
              <History className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Zincirleme Zimmet & Devir Takip Çizelgesi
              </DialogTitle>
              <DialogDescription className="text-xs">
                Devlet Arşiv Hizmetleri Yönetmeliği uyarınca dosyanın kurum içi tüm el değiştirme tarihçesi.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 text-xs">
          {/* Üst Bilgi Kartı */}
          <div className="rounded-xl border border-border bg-card p-3 shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">{loan.folderTitle}</span>
              <Badge variant="outline" className="font-mono text-primary border-primary/30">
                {loan.folderBarcode}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <FileText className="size-3 text-sky-500" />
                <span>SDP Kodu: <strong className="text-foreground">{loan.filePlanCode}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-3 text-amber-500" />
                <span>İlk Veriliş: <strong className="text-foreground">{new Date(loan.checkedOutAt).toLocaleDateString("tr-TR")}</strong></span>
              </div>
            </div>
          </div>

          {/* En Son Durum Vurgusu (En Son Kimde ve Nerede) */}
          <div className="rounded-xl border-2 border-indigo-500/30 bg-indigo-500/5 p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-indigo-600" />
                GÜNCEL DURUM (EN SON KİMDE & NEREDE)
              </span>
              <Badge className="bg-indigo-600 text-white text-[10px]">
                {chain.length > 0 ? `${chain.length} Kez Devredildi` : "İlk Zimmette"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-1">
              <div className="flex items-start gap-2 rounded-lg bg-background/80 p-2 border border-border">
                <UserCheck className="size-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-muted-foreground block">En Son Zimmet Sahibi:</span>
                  <span className="font-bold text-foreground text-xs">{currentHolder}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-background/80 p-2 border border-border">
                <MapPin className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-muted-foreground block">En Son Bulunduğu Yer:</span>
                  <span className="font-semibold text-foreground text-xs">{currentLocation}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Kronolojik Devir Zaman Çizelgesi (Timeline) */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-foreground">
              Kronolojik Dolaşım & Devir Adımları
            </span>

            <div className="relative pl-6 space-y-4 border-l-2 border-indigo-200 dark:border-indigo-900 ml-3 py-1">
              {/* Adım 0: Arşivden İlk Çıkış */}
              <div className="relative">
                <div className="absolute -left-[31px] top-0 flex size-5 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">
                  1
                </div>
                <div className="rounded-xl border border-border bg-card p-3 shadow-xs flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      Arşivden İlk Teslim-Tesellüm
                    </span>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {new Date(loan.checkedOutAt).toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <div className="text-xs text-foreground mt-0.5">
                    <strong>Kurum Arşivi Yetkilisi</strong> ➔ <strong>{loan.borrowerSubjectId}</strong>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 bg-muted/30 p-2 rounded">
                    <strong>Gerekçe:</strong> {loan.purpose}
                  </p>
                </div>
              </div>

              {/* Devir Adımları */}
              {chain.map((record, index) => (
                <div key={record.id} className="relative">
                  <div className="absolute -left-[31px] top-0 flex size-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                    {index + 2}
                  </div>
                  <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-3 shadow-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300">
                        {index + 1}. Kurum İçi Zimmet Devri
                      </span>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {new Date(record.transferredAt).toLocaleString("tr-TR")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="font-medium text-muted-foreground line-through">
                        {record.fromUser}
                      </span>
                      <ArrowRight className="size-3 text-indigo-500 shrink-0" />
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded">
                        {record.toUser}
                      </span>
                    </div>

                    {record.location && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <MapPin className="size-3 text-amber-500 shrink-0" />
                        <span>Yeni Konum: <strong>{record.location}</strong></span>
                      </div>
                    )}

                    {record.officialDocNo && (
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Resmi Yazı: {record.officialDocNo}
                      </div>
                    )}

                    <p className="text-[11px] text-muted-foreground bg-background/80 p-2 rounded border border-border">
                      <strong>Devir Nedeni:</strong> {record.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="size-3.5" />
            Tarihçeyi Yazdır
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="bg-primary text-primary-foreground font-semibold"
          >
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
