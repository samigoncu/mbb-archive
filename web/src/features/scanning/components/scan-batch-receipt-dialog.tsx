"use client";

import { useState } from "react";
import {
  FileText,
  Printer,
  ShieldCheck,
  ScanLine,
  CheckCircle2,
  Calendar,
  User,
  Building2,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ScanBatchReceiptDialog({
  unitName = "Yazı İşleri ve Kararlar Dairesi Başkanlığı",
  folderCode = "",
  triggerLabel = "Teslim-Tesellüm Tutanağı Formu",
  triggerVariant = "outline",
  triggerSize = "sm",
}: {
  unitName?: string;
  folderCode?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
  triggerSize?: "default" | "sm" | "xs";
}) {
  const [open, setOpen] = useState(false);
  const [deliveringOfficer, setDeliveringOfficer] = useState("");
  const [receivingOperator, setReceivingOperator] = useState("");
  const [pageCount, setPageCount] = useState<number | "">("");
  const [folderReference, setFolderReference] = useState(folderCode);
  const [notes, setNotes] = useState("Fiziksel evraklar tam ve eksiksiz olarak teslim alınmıştır.");

  const todayFormatted = new Date().toLocaleDateString("tr-TR", {
    dateStyle: "medium",
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
        <ScanLine className="size-3.5 text-primary" />
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
                Tarama ve Fiziksel Evrak Teslim Tutanağı Formu
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Fiziksel evrakların dijitalleştirme birimine devir ve teslim formu
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Parametreleri (Yazdırmada Gizli) */}
        <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3 print:hidden text-xs">
          <p className="font-semibold text-foreground">Tutanak Parametrelerini Doldurun (İsteğe Bağlı):</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px]">Teslim Eden Personel</Label>
              <Input
                placeholder="Ad Soyad / Unvan"
                value={deliveringOfficer}
                onChange={(e) => setDeliveringOfficer(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div>
              <Label className="text-[11px]">Teslim Alan Tarama Operatörü</Label>
              <Input
                placeholder="Ad Soyad / Unvan"
                value={receivingOperator}
                onChange={(e) => setReceivingOperator(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div>
              <Label className="text-[11px]">Klasör / Dosya Kodu</Label>
              <Input
                placeholder="Örn: 2026/KL-0042"
                value={folderReference}
                onChange={(e) => setFolderReference(e.target.value)}
                className="h-8 text-xs bg-background"
              />
            </div>
            <div>
              <Label className="text-[11px]">Tahmini Sayfa / Belge Sayısı</Label>
              <Input
                type="number"
                placeholder="Örn: 150"
                value={pageCount}
                onChange={(e) => setPageCount(Number(e.target.value) || "")}
                className="h-8 text-xs bg-background"
              />
            </div>
          </div>
        </div>

        {/* Resmi Tutanak Belgesi (Yazdırılabilir Alan) */}
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
              FİZİKSEL EVRAK TARAMA VE DİJİTAL ARŞİV TESLİM-TESELLÜM TUTANAĞI
            </div>
          </div>

          {/* Teslimat Detayları Tablosu */}
          <div className="grid grid-cols-2 gap-3 text-xs border-b border-border pb-4">
            <div>
              <span className="text-muted-foreground block">Teslim Eden Birim:</span>
              <span className="font-semibold text-foreground">{unitName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Düzenlenme Tarihi:</span>
              <span className="font-semibold text-foreground">{todayFormatted}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Klasör / Dosya Referansı:</span>
              <span className="font-mono text-foreground font-semibold">
                {folderReference || "_____________________"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Sayfa / Evrak Adedi:</span>
              <span className="font-medium text-foreground">
                {pageCount ? `${pageCount} Sayfa` : "_____ Sayfa"}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground block">Tarama Standardı:</span>
              <span className="text-foreground">
                300 DPI, Optik Karakter Tanıma (OCR), PDF/A Standart Dijital Koruma
              </span>
            </div>
          </div>

          {/* Teslimat Açıklaması */}
          <div className="text-xs space-y-2 border-b border-border pb-4">
            <p className="font-semibold text-foreground">Teslim ve Kabul Şartları:</p>
            <p className="text-muted-foreground leading-relaxed bg-muted/20 p-2.5 rounded border border-border">
              Yukarıda niteliği belirtilen fiziksel arşiv evrakları; taranmak, üstverisi indekslenmek ve EBYS dijital arşiv havuzuna aktarılmak üzere tarama merkezine eksiksiz olarak teslim edilmiştir. Dijitalleştirme sonrası fiziksel kopyalar arşiv yerleşim planına uygun olarak raf/kutu düzeninde muhafaza edilecektir.
            </p>
          </div>

          {/* Güvenlik & Doğrulama */}
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
              <span>Dijital Entegrasyon Güvencesi</span>
            </div>
            <p className="mt-1">
              Taranan her bir sayfa ve oluşturulan PDF/A dosyası, MBB Arşiv Sistemi tarafından SHA-256 kriptografik özeti çıkarılarak kaydedilmekte ve yetkisiz değişikliklere karşı WORM güvencesiyle korunmaktadır.
            </p>
          </div>

          {/* İmza Alanları */}
          <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="font-semibold text-foreground">Teslim Eden (Birim Yetkilisi)</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {deliveringOfficer || "Ad Soyad / Unvan"}
              </p>
              <div className="mt-10 border-t border-dashed border-border pt-1 text-[10px] text-muted-foreground">
                Tarih / İmza
              </div>
            </div>

            <div>
              <p className="font-semibold text-foreground">Teslim Alan (Tarama Operatörü)</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {receivingOperator || "Ad Soyad / Unvan"}
              </p>
              <div className="mt-10 border-t border-dashed border-border pt-1 text-[10px] text-muted-foreground">
                Tarih / İmza
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

