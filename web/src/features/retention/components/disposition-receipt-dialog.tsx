"use client";

import { useState } from "react";
import {
  FileText,
  Printer,
  Download,
  ShieldCheck,
  FileCheck,
  FileSignature,
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
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Disposition } from "../model/disposition";
import { actionLabels } from "../model/retention";

export function DispositionReceiptDialog({
  process,
  triggerLabel,
  triggerVariant = "outline",
  triggerSize = "sm",
}: {
  process: Disposition;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
  triggerSize?: "default" | "sm" | "lg";
}) {
  const [open, setOpen] = useState(false);

  const isCompleted = process.status === "Completed";
  const isDestruction = process.action === "Destroy";
  const isTransfer = process.action === "Transfer";

  const defaultLabel = isCompleted
    ? "Resmi Tutanağı Görüntüle"
    : "Tutanak Formunu Hazırla & Yazdır";

  const dateFormatted = process.completedAt
    ? new Date(process.completedAt).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) + " (İşlem Öncesi Form)";

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
            className="gap-1.5 shadow-xs text-xs font-medium"
          />
        }
      >
        {isCompleted ? (
          <FileCheck className="size-3.5" />
        ) : (
          <FileSignature className="size-3.5" />
        )}
        <span>{triggerLabel || defaultLabel}</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto print:p-0 print:max-w-full print:shadow-none print:border-none">
        <DialogHeader className="pb-3 border-b border-border print:hidden">
          <div className="flex items-center gap-2 text-primary">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {isCompleted
                  ? isDestruction
                    ? "Onaylı Fiziksel İmha Tutanağı"
                    : "Onaylı Arşiv Devir ve Teslim Tutanağı"
                  : isDestruction
                  ? "Fiziksel İmha ve Tasfiye Tutanağı Formu (İmza İçin Hazır)"
                  : "Arşiv Devir ve Teslim Tutanağı Formu (İmza İçin Hazır)"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Mersin Büyükşehir Belediyesi resmi standart tasfiye/tutanak belgesi
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tutanak Gövdesi (Yazdırılabilir Alan) */}
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
              {isDestruction
                ? "FİZİKSEL EVRAK İMHA VE TASFİYE TUTANAĞI"
                : isTransfer
                ? "KURUM ARŞİVİ DEVİR VE TESLİM ALMA TUTANAĞI"
                : "ARŞİV SAKLAMA VE TASFİYE KARAR TUTANAĞI"}
              {!isCompleted && " (FORM / TASLAK)"}
            </div>
          </div>

          {/* Protokol & Referans Bilgileri */}
          <div className="grid grid-cols-2 gap-3 text-xs border-b border-border pb-4">
            <div>
              <span className="text-muted-foreground block">Tutanak / Referans No:</span>
              <span className="font-semibold font-mono text-foreground">
                {process.receiptReference || process.commissionReference || process.id.slice(0, 8)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">İşlem / Düzenleme Tarihi:</span>
              <span className="font-semibold text-foreground">{dateFormatted}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Tasfiye Niteliği:</span>
              <span className="font-medium text-foreground">
                {actionLabels[process.action] ?? process.action}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Belge / Dosya Kimliği:</span>
              <span className="font-mono text-foreground text-[11px]">
                {process.documentId}
              </span>
            </div>
          </div>

          {/* Değerlendirme & Gerekçe */}
          <div className="space-y-2 text-xs border-b border-border pb-4">
            <p className="font-semibold text-foreground">1. Tasfiye Gerekçesi ve Dayanak</p>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-2.5 rounded border border-border">
              {process.reason}
            </p>
            {process.approvalReference && (
              <p className="text-[11px] text-muted-foreground">
                <strong>Nihai Onay Referansı:</strong> {process.approvalReference} ({process.approvedBy})
              </p>
            )}
          </div>

          {/* Gerçekleşme & Kanıt Bilgisi (İmha veya Devir) */}
          <div className="space-y-2 text-xs border-b border-border pb-4">
            <p className="font-semibold text-foreground">
              {isDestruction ? "2. Fiziksel İmha Uygulama Bilgileri" : "2. Devir ve Teslimat Bilgileri"}
            </p>
            <div className="grid grid-cols-2 gap-2 bg-muted/20 p-2.5 rounded border border-border">
              {isDestruction ? (
                <>
                  <div>
                    <span className="text-muted-foreground block">İmha Yöntemi:</span>
                    <span className="font-medium">{process.executionMethod || "Kırpma / Hamurlaştırma"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">İmha Yeri:</span>
                    <span className="font-medium">{process.executionLocation || "MBB Arşiv İmha Alanı"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block">Tanıklar ve Görevleri:</span>
                    <span className="font-medium whitespace-pre-wrap">
                      {process.executionWitnesses || "Komisyon Heyeti ve Görevli Tanıklar"}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-muted-foreground block">Teslim Alan Kurum / Arşiv:</span>
                    <span className="font-medium">{process.receivingArchive || "Mersin Büyükşehir Belediyesi Kurum Arşivi"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Teslim Alan Yetkili:</span>
                    <span className="font-medium">{process.completedBy || "___________________________"}</span>
                  </div>
                  {process.transferPackageId && (
                    <div className="col-span-2 font-mono text-[11px] text-muted-foreground">
                      <span>Devir Paketi SHA-256: {process.transferPackageSha256 || "-"}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Dijital Güvence Beyanı */}
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
              <span>Dijital Koruma ve Değişmezlik Garantisi</span>
            </div>
            <p className="mt-1">
              {isDestruction
                ? "İşbu tutanakla sadece fiziksel nüshaların imhası gerçekleştirilir. Belgenin dijital asılları, onay ve paraf üstverileri ile kriptografik hash özetleri MBB Dijital Arşiv Sistemi bünyesinde süresiz ve değişmez olarak korunmaktadır."
                : "Devir işlemi tamamlanan evrakın dijital paketi ve manifest özetleri doğrulanmış olup, arşiv saklama mevzuatına uygun olarak muhafaza altına alınmıştır."}
            </p>
          </div>

          {/* İmza Alanları */}
          <div className="mt-6 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <p className="font-semibold text-foreground">Hazırlayan</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{process.createdBy}</p>
              <div className="mt-8 border-t border-dashed border-border pt-1 text-[10px] text-muted-foreground">
                İmza
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground">Komisyon Heyeti</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {process.members.map((m) => m.subject).join(", ") || "Komisyon Üyeleri"}
              </p>
              <div className="mt-8 border-t border-dashed border-border pt-1 text-[10px] text-muted-foreground">
                İmza
              </div>
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {isDestruction ? "İmha Yürütme / Onay" : "Teslim Alan / Veren"}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {process.completedBy || process.approvedBy || "Yetkili Makam"}
              </p>
              <div className="mt-8 border-t border-dashed border-border pt-1 text-[10px] text-muted-foreground">
                İmza
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-border flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
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
            {isCompleted && (
              <a
                href={`/devir-imha/islemler/${process.id}/tutanak`}
                download={`arsiv-tutanagi-${process.id}.json`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
              >
                <Download className="size-3.5" />
                <span>JSON İndir</span>
              </a>
            )}
          </div>

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

