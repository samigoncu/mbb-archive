"use client";

import { useState, useEffect } from "react";
import {
  History,
  BookOpenCheck,
  Clock,
  CheckCircle2,
  TriangleAlert,
  ShieldCheck,
  Printer,
  FileText,
  User,
  Calendar,
  Building2,
  FolderArchive,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LoanDetailsItem } from "../model/loan";
import type { Branding } from "@/features/branding/model/branding";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function LoanTimelineModal({
  loan,
  branding,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  initialTab = "timeline",
  triggerHidden = false,
}: {
  loan: LoanDetailsItem;
  branding?: Branding | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialTab?: "timeline" | "receipt";
  triggerHidden?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  const [activeTab, setActiveTab] = useState<"timeline" | "receipt">(initialTab);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab, loan.id]);

  const isReturned = loan.status === "Returned";
  const wasOverdueAtReturn =
    isReturned &&
    loan.returnedAt &&
    loan.dueAt &&
    new Date(loan.returnedAt).getTime() > new Date(loan.dueAt).getTime();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!triggerHidden && (
        <DialogTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs font-medium hover:border-primary/50 hover:bg-primary/5"
              aria-label={`${loan.folderBarcode} zimmet tarihçesi ve tutanağı`}
            />
          }
        >
          <History className="size-3.5 text-primary" aria-hidden />
          <span>Tarihçe</span>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl md:max-w-3xl">
        {/* Header */}
        <DialogHeader className="border-b border-border/80 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-primary">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <History className="size-5" aria-hidden />
              </span>
              <div>
                <DialogTitle className="text-base font-semibold">
                  Zimmet Süreç Tarihçesi & Tutanak
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {loan.folderBarcode} · {loan.folderTitle}
                </DialogDescription>
              </div>
            </div>

            {/* Tab switchers */}
            <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("timeline")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  activeTab === "timeline"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Süreç Çizelgesi
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("receipt")}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                  activeTab === "receipt"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Resmi Tutanak
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "timeline" ? (
            <div className="space-y-6">
              {/* Quick Info Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-border/80 bg-muted/20 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Klasör Barkod</span>
                  <span className="font-mono font-semibold text-foreground">{loan.folderBarcode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">SDP Kodu</span>
                  <span className="font-mono font-medium text-foreground">{loan.filePlanCode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Teslim Alan</span>
                  <span className="font-semibold text-foreground">{loan.borrowerSubjectId}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Genel Statü</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5 py-0 h-4 mt-0.5",
                      isReturned
                        ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/5"
                        : loan.isOverdue
                          ? "border-destructive/30 text-destructive bg-destructive/5"
                          : "border-blue-500/30 text-blue-600 bg-blue-500/5",
                    )}
                  >
                    {isReturned ? "İade Alındı" : loan.isOverdue ? "Gecikmiş" : "Zimmette"}
                  </Badge>
                </div>
              </div>

              {/* Visual Vertical Timeline */}
              <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {/* 1. Ödünç Verilme Aşaması */}
                <div className="relative">
                  <span className="absolute -left-6 flex size-5 items-center justify-center rounded-full bg-blue-500 text-white ring-4 ring-background">
                    <BookOpenCheck className="size-3" aria-hidden />
                  </span>
                  <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        1. Zimmet Başlangıcı (Ödünç Verildi)
                      </h4>
                      <time className="text-[11px] text-muted-foreground font-medium">
                        {formatDate(loan.checkedOutAt)}
                      </time>
                    </div>
                    <p className="text-xs text-foreground">
                      Fiziksel klasör, <strong>{loan.checkedOutBy || "Arşiv Görevlisi"}</strong> tarafından <strong>{loan.borrowerSubjectId}</strong> personeline teslim edildi.
                    </p>
                    <div className="rounded-lg bg-muted/40 p-2.5 text-xs">
                      <span className="font-semibold text-muted-foreground block text-[10px] uppercase">
                        Kayıtlı Gerekçe / Resmi Yazı
                      </span>
                      <p className="mt-0.5 text-foreground italic">&ldquo;{loan.purpose}&rdquo;</p>
                    </div>
                  </div>
                </div>

                {/* 2. Vade ve Süre Durumu */}
                <div className="relative">
                  <span
                    className={cn(
                      "absolute -left-6 flex size-5 items-center justify-center rounded-full text-white ring-4 ring-background",
                      loan.isOverdue
                        ? "bg-destructive"
                        : isReturned
                          ? "bg-muted-foreground"
                          : "bg-amber-500",
                    )}
                  >
                    <Clock className="size-3" aria-hidden />
                  </span>
                  <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-foreground">
                        2. Vade & İade Takip Süresi
                      </h4>
                      <time className="text-[11px] text-muted-foreground font-medium">
                        Son Tarih: {formatDateOnly(loan.dueAt)} (23:59)
                      </time>
                    </div>
                    {isReturned ? (
                      <p className="text-xs text-muted-foreground">
                        {wasOverdueAtReturn ? (
                          <span className="text-amber-600 dark:text-amber-400 font-medium">
                            ⚠️ Dosya belirlenen vade tarihinden sonra gecikmeli olarak teslim edildi.
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ Dosya belirlenen yasal vade süresi içinde teslim alındı.
                          </span>
                        )}
                      </p>
                    ) : loan.isOverdue ? (
                      <p className="text-xs text-destructive font-medium">
                        ⚠️ Son iade tarihi {loan.daysOverdue} gün önce dolmuştur. İlgili birime iade ihtarı yapılması gereklidir.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Zimmet süresi devam ediyor. Dosya personelin kullanımında.
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. İade ve Teslim Alma Aşaması */}
                <div className="relative">
                  <span
                    className={cn(
                      "absolute -left-6 flex size-5 items-center justify-center rounded-full text-white ring-4 ring-background",
                      isReturned ? "bg-emerald-500" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isReturned ? (
                      <ShieldCheck className="size-3" aria-hidden />
                    ) : (
                      <span className="size-2 rounded-full bg-muted-foreground/40" />
                    )}
                  </span>
                  <div
                    className={cn(
                      "rounded-xl border p-4 shadow-xs space-y-2",
                      isReturned
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-dashed border-border/80 bg-muted/10 opacity-70",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <h4
                        className={cn(
                          "text-xs font-semibold",
                          isReturned
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-muted-foreground",
                        )}
                      >
                        3. İade & Arşive Kabul İşlemi
                      </h4>
                      {isReturned && (
                        <time className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          {formatDate(loan.returnedAt)}
                        </time>
                      )}
                    </div>

                    {isReturned ? (
                      <div className="space-y-2">
                        <p className="text-xs text-foreground">
                          Fiziksel klasör kontrol edilerek arşive kabul edildi ve statüsü tekrar <strong>&ldquo;Kullanılabilir (Available)&rdquo;</strong> olarak güncellendi.
                        </p>

                        {/* İade Notu / Durum Açıklaması */}
                        <div className="rounded-lg border border-emerald-500/20 bg-background/80 p-3 text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300 text-[11px] mb-1">
                            <MessageSquare className="size-3.5" aria-hidden />
                            <span>İade Açıklaması & Fiziki Muayene Notu:</span>
                          </div>
                          <p className="text-foreground leading-relaxed italic">
                            {loan.returnNote ? (
                              `“${loan.returnNote}”`
                            ) : (
                              <span className="text-muted-foreground not-italic">
                                İade sırasında standart teslim işlemi yapıldı (özel durum notu girilmedi).
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Klasör henüz iade edilmedi. Teslim alındığında iade notu, kontrol durumu ve kabul tarihi buraya işlenecektir.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Resmi Teslim-Tesellüm Tutanağı */
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handlePrint}
                  className="gap-1.5 text-xs"
                >
                  <Printer className="size-3.5" aria-hidden />
                  <span>Yazdır / PDF Kaydet</span>
                </Button>
              </div>

              <div
                id="printable-loan-receipt"
                className="rounded-xl border border-border bg-card p-6 text-foreground shadow-xs font-sans space-y-6"
              >
                {/* Tutanak Başlığı */}
                <div className="text-center border-b border-border pb-4 space-y-1">
                  <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {branding?.institutionName?.trim() || "T.C. MERSİN BÜYÜKŞEHİR BELEDİYESİ"}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    {branding?.departmentName?.trim() || "Yazı İşleri ve Kararlar Dairesi Başkanlığı · Arşiv Şube Müdürlüğü"}
                  </p>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide pt-1">
                    FİZİKSEL ARŞİV DOSYASI TESLİM-TESELLÜM TUTANAĞI
                  </h3>
                </div>

                {/* Dosya Bilgileri Tablosu */}
                <div className="rounded-lg border border-border/80 overflow-hidden text-xs">
                  <table className="w-full divide-y divide-border/60">
                    <tbody className="divide-y divide-border/60">
                      <tr>
                        <td className="w-1/3 bg-muted/40 p-2.5 font-semibold text-muted-foreground">
                          Dosya / Klasör Barkodu
                        </td>
                        <td className="p-2.5 font-mono font-bold text-foreground">
                          {loan.folderBarcode}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-muted/40 p-2.5 font-semibold text-muted-foreground">
                          Klasör Başlığı
                        </td>
                        <td className="p-2.5 font-medium text-foreground">
                          {loan.folderTitle}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-muted/40 p-2.5 font-semibold text-muted-foreground">
                          Standart Dosya Planı (SDP)
                        </td>
                        <td className="p-2.5 font-mono text-foreground">
                          {loan.filePlanCode}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-muted/40 p-2.5 font-semibold text-muted-foreground">
                          Teslim Eden (Arşiv Görevlisi)
                        </td>
                        <td className="p-2.5 font-semibold text-foreground">
                          {loan.checkedOutBy || "Arşiv Görevlisi"}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-muted/40 p-2.5 font-semibold text-muted-foreground">
                          Teslim Alan Personel
                        </td>
                        <td className="p-2.5 font-semibold text-foreground">
                          {loan.borrowerSubjectId}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-muted/40 p-2.5 font-semibold text-muted-foreground">
                          Zimmet Çıkış Tarihi
                        </td>
                        <td className="p-2.5 text-foreground">
                          {formatDate(loan.checkedOutAt)}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-muted/40 p-2.5 font-semibold text-muted-foreground">
                          Son İade Vade Tarihi
                        </td>
                        <td className="p-2.5 text-foreground">
                          {formatDateOnly(loan.dueAt)}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-muted/40 p-2.5 font-semibold text-muted-foreground">
                          Zimmet Gerekçesi
                        </td>
                        <td className="p-2.5 text-foreground italic">
                          {loan.purpose}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-muted/40 p-2.5 font-semibold text-muted-foreground">
                          İade / Teslim Alma Durumu
                        </td>
                        <td className="p-2.5">
                          {isReturned ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              İade Edildi ({formatDate(loan.returnedAt)})
                            </span>
                          ) : (
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              Zimmette (Aktif Dolaşımda)
                            </span>
                          )}
                        </td>
                      </tr>
                      {isReturned && (
                        <tr>
                          <td className="bg-muted/40 p-2.5 font-semibold text-muted-foreground">
                            İade Durum Açıklaması
                          </td>
                          <td className="p-2.5 text-foreground font-medium">
                            {loan.returnNote || "Eksiksiz ve hasarsız teslim alındı."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Yasal Hüküm ve İmzalar */}
                <div className="pt-2 space-y-8 text-[11px] text-muted-foreground">
                  <p className="leading-relaxed text-justify">
                    Yukarıda kimliği ve nitelikleri belirtilen fiziksel arşiv klasörü, resmi inceleme/çalışma amacıyla eksiksiz teslim edilmiş olup mevzuata uygun biçimde muhafaza edilerek vadesinde iade edilecektir.
                  </p>

                  <div className="grid grid-cols-2 gap-8 text-center pt-4">
                    <div className="space-y-4">
                      <p className="font-semibold text-foreground">TESLİM EDEN (Arşiv Görevlisi)</p>
                      <p className="text-xs font-medium text-foreground">{loan.checkedOutBy || "Arşiv Görevlisi"}</p>
                      <div className="pt-8">
                        <p className="text-muted-foreground border-t border-dashed pt-1 mx-8">İmza / Mühür</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <p className="font-semibold text-foreground">TESLİM ALAN (Personel)</p>
                      <p className="text-xs font-medium text-foreground">{loan.borrowerSubjectId}</p>
                      <div className="pt-8">
                        <p className="text-muted-foreground border-t border-dashed pt-1 mx-8">İmza</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

