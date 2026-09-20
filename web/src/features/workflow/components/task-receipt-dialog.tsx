"use client";

import { useState } from "react";
import {
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  User,
  Clock,
  Building2,
  FileCheck2,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { WorkflowWorkItem } from "../model/workflow";
import { workItemStatusLabels } from "../model/workflow";

export function TaskReceiptDialog({
  item,
  documentTitle,
  triggerLabel = "İşlem Tutanağı",
  triggerVariant = "outline",
  triggerSize = "sm",
}: {
  item: WorkflowWorkItem;
  documentTitle?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "default" | "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);

  const dateFormatted = item.completedAt
    ? new Date(item.completedAt).toLocaleString("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className="gap-1.5 shadow-xs font-medium text-xs"
          />
        }
      >
        <FileCheck2 className="size-3.5 text-primary" />
        <span>{triggerLabel}</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto print:p-0 print:max-w-full print:shadow-none print:border-none">
        <DialogHeader className="pb-3 border-b border-border print:hidden">
          <div className="flex items-center gap-2 text-primary">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                İş Akışı ve Görev Sonuç Tutanağı
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Mersin Büyükşehir Belediyesi resmi iş akışı karar ve işlem belgesi
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Yazdırılabilir Resmi Tutanak Gövdesi */}
        <div className="rounded-lg border border-border bg-card p-6 text-sm print:border-none print:p-0 print:bg-white print:text-black space-y-4">
          {/* Resmi Üst Başlık */}
          <div className="text-center border-b border-border pb-4 space-y-1">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              T.C.
            </p>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              MERSİN BÜYÜKŞEHİR BELEDİYE BAŞKANLIĞI
            </h2>
            <p className="text-xs font-medium text-muted-foreground">
              Yazı İşleri ve Kararlar Dairesi Başkanlığı · Arşiv Şube Müdürlüğü
            </p>
            <div className="mt-3 inline-block rounded-md bg-muted px-3 py-1 text-xs font-bold uppercase tracking-wider">
              İŞ AKIŞI GÖREV VE KARAR SONUÇ TUTANAĞI
            </div>
          </div>

          {/* Evrak & Süreç Referansları */}
          <div className="grid grid-cols-2 gap-3 text-xs border-b border-border pb-4">
            <div>
              <span className="text-muted-foreground block">Evrak Başlığı:</span>
              <span className="font-semibold text-foreground">
                {documentTitle || "İlgili Arşiv Belgesi"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">İşlem Tarihi:</span>
              <span className="font-semibold text-foreground">{dateFormatted}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">İş Akışı Tanımı:</span>
              <span className="font-medium text-foreground">{item.definitionName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Süreç Adımı:</span>
              <span className="font-medium text-foreground">{item.nodeName || "İş Akışı Adımı"}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground block">Evrak / Sistem Kimliği:</span>
              <span className="font-mono text-[11px] text-foreground">{item.documentId}</span>
            </div>
          </div>

          {/* Görev & Karar Detayları */}
          <div className="space-y-2 text-xs border-b border-border pb-4">
            <p className="font-semibold text-foreground">Görev ve Karar Bilgisi</p>
            <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-lg border border-border">
              <div>
                <span className="text-muted-foreground block">Görevi Atayan / Başlatan:</span>
                <span className="font-medium text-foreground">{item.assignedBy || "Sistem / Otomasyon"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Atama Zamanı:</span>
                <span className="font-medium text-foreground">
                  {item.assignedAt ? new Date(item.assignedAt).toLocaleString("tr-TR") : new Date(item.createdAt).toLocaleString("tr-TR")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Görevli / Tamamlayan:</span>
                <span className="font-medium text-foreground">
                  {item.completedBy || item.assigneeSubjectId || "Yetkili Personel"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Nihai Karar / Sonuç:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {item.outcome ? (item.outcome === "completed" ? "Uygun Görülerek Tamamlandı" : item.outcome) : "Tamamlandı"}
                </span>
              </div>
            </div>
          </div>

          {/* Güvenlik & Doğrulama */}
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
              <span>Elektronik Süreç ve Değişmezlik Doğrulaması</span>
            </div>
            <p className="mt-1">
              İşbu tutanak, MBB Elektronik Belge ve Arşiv Sistemi (EBYS) iş akışı motoru tarafından üretilmiştir. Görev adımları, atama zamanı ve onay kararları kriptografik denetim izleriyle (audit trail) zaman damgalı olarak kayıt altına alınmıştır.
            </p>
          </div>

          {/* Yetkili İmzaları */}
          <div className="mt-6 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <p className="font-semibold text-foreground">Görevi Yürüten Personel</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {item.completedBy || item.assigneeSubjectId || "Görevli"}
              </p>
              <div className="mt-8 border-t border-dashed border-border pt-1 text-[10px] text-muted-foreground">
                İmza / Paraf
              </div>
            </div>

            <div>
              <p className="font-semibold text-foreground">Süreç Sorumlusu / Atayan</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {item.assignedBy || "Birim Sorumlusu"}
              </p>
              <div className="mt-8 border-t border-dashed border-border pt-1 text-[10px] text-muted-foreground">
                İmza / Onay
              </div>
            </div>

            <div>
              <p className="font-semibold text-foreground">Arşiv Şube Müdürü</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Onay Makamı</p>
              <div className="mt-8 border-t border-dashed border-border pt-1 text-[10px] text-muted-foreground">
                İmza / Mühür
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border flex items-center justify-between gap-2 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-1.5"
          >
            <Printer className="size-3.5" />
            <span>Yazdır / PDF Olarak Kaydet</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setOpen(false)}
          >
            Kapat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
