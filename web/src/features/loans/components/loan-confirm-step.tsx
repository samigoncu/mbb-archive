"use client";

import { FolderArchive, ShieldCheck, User } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";
import type { LoanBorrower } from "../api/loan-selection-actions";

const QUICK_PURPOSES = [
  "Denetim ve Teftiş İncelemesi",
  "Hukuki Süreç / Dava Dosyası",
  "Birim İçi Çalışma ve İnceleme",
  "Sayıştay Denetimi",
  "Vatandaş Bilgi Edinme Talebi",
];

const DURATION_PRESETS = [
  { label: "7 Gün (1 Hafta)", days: 7 },
  { label: "15 Gün", days: 15 },
  { label: "30 Gün (1 Ay)", days: 30 },
  { label: "60 Gün (2 Ay)", days: 60 },
];

export function LoanConfirmStep({
  folder,
  borrower,
  purpose,
  onPurposeChange,
  dueAt,
  onDueAtChange,
  todayStr,
  onStepChange,
  handleCheckout,
  onSuccess,
}: {
  folder: FolderListItem;
  borrower: LoanBorrower;
  purpose: string;
  onPurposeChange: (value: string) => void;
  dueAt: string;
  onDueAtChange: (value: string) => void;
  todayStr: string;
  onStepChange: (step: 1 | 2 | 3) => void;
  handleCheckout: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  onSuccess: () => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto pr-1">
      <ActionForm
        action={handleCheckout}
        label="Ödünç kaydını oluştur"
        submitClassName="mt-6 sm:mt-7 h-10 w-full rounded-xl text-xs font-semibold shadow-xs hover:bg-primary/90 transition-all"
        onSuccess={onSuccess}
      >
        <input type="hidden" name="folderId" value={folder.id} />
        <input type="hidden" name="borrowerSubjectId" value={borrower.subjectId} />

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
          {/* Sol Kolon: Seçilenler & Bilgilendirme */}
          <div className="md:col-span-5 space-y-2.5">
            <div className="rounded-xl border border-border/70 bg-card p-3 space-y-1.5 text-xs shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground gap-2">
                <span className="flex items-center gap-1.5 font-semibold text-foreground whitespace-nowrap">
                  <FolderArchive className="size-3.5 text-primary shrink-0" aria-hidden />
                  Fiziksel Dosya
                </span>
                <button
                  type="button"
                  onClick={() => onStepChange(1)}
                  className="text-[11px] text-primary hover:underline font-medium shrink-0"
                >
                  Değiştir
                </button>
              </div>
              <div className="space-y-0.5">
                <p className="font-mono font-bold text-foreground text-xs">{folder.barcode}</p>
                <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed font-medium">
                  {folder.title}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-muted-foreground/30 shrink-0"
                >
                  SDP {folder.filePlanCode}
                </Badge>
                {folder.locationName && (
                  <span className="truncate">· {folder.locationName}</span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-card p-3 space-y-1.5 text-xs shadow-xs">
              <div className="flex items-center justify-between text-muted-foreground gap-2">
                <span className="flex items-center gap-1.5 font-semibold text-foreground whitespace-nowrap">
                  <User className="size-3.5 text-primary shrink-0" aria-hidden />
                  Teslim Alan Personel
                </span>
                <button
                  type="button"
                  onClick={() => onStepChange(2)}
                  className="text-[11px] text-primary hover:underline font-medium shrink-0"
                >
                  Değiştir
                </button>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary text-xs">
                  {borrower.subjectId.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground text-xs truncate">
                      {borrower.subjectId}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 shrink-0"
                    >
                      Etkin Personel
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {borrower.unitName}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs space-y-1 text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-primary whitespace-nowrap">
                <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                <span className="text-[11px]">Resmi Zimmet Tutanak Bilgisi</span>
              </div>
              <p className="text-[10.5px] leading-relaxed">
                İşlem tamamlandığında, kurum üst bilgili resmi teslim tutanağı otomatik açılacaktır.
              </p>
            </div>
          </div>

          {/* Sağ Kolon: Form Girdileri */}
          <div className="md:col-span-7 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="loan-purpose"
                  className="text-xs font-semibold text-foreground whitespace-nowrap"
                >
                  Zimmet Gerekçesi
                </label>
                <span className="text-[10.5px] text-muted-foreground whitespace-nowrap">
                  Resmi tutanağa işlenir
                </span>
              </div>
              <textarea
                id="loan-purpose"
                name="purpose"
                required
                maxLength={1000}
                rows={3}
                value={purpose}
                onChange={(e) => onPurposeChange(e.target.value)}
                placeholder="Dosyanın teslim edilme gerekçesi veya resmi yazı referansı..."
                className="block w-full rounded-xl border border-input bg-background p-2.5 text-xs leading-relaxed placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
              />
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap mr-0.5">
                  Şablonlar:
                </span>
                {QUICK_PURPOSES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPurposeChange(item)}
                    className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10.5px] text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all whitespace-nowrap"
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="loan-due-at"
                  className="text-xs font-semibold text-foreground whitespace-nowrap"
                >
                  Son İade Tarihi
                </label>
                <span className="text-[10.5px] text-muted-foreground whitespace-nowrap">
                  Gün sonu (23:59) geçerlidir
                </span>
              </div>
              <Input
                id="loan-due-at"
                name="dueAt"
                type="date"
                required
                min={todayStr}
                value={dueAt}
                onChange={(e) => onDueAtChange(e.target.value)}
                className="h-9 rounded-xl bg-background text-xs"
              />
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap mr-0.5">
                  Hızlı Süre:
                </span>
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const target = new Date(Date.now() + preset.days * 86400000);
                      onDueAtChange(target.toISOString().split("T")[0]);
                    }}
                    className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[10.5px] text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all whitespace-nowrap"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ActionForm>
    </div>
  );
}

