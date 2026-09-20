"use client";

import { useState, useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  Gavel,
  Plus,
  Clock,
  FileText,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
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
import { toast } from "sonner";
import {
  createRuleAction,
  type ProcessActionState,
} from "../api/disposition-actions";

const MONTH_PRESETS = [
  { label: "1 Yıl (12 Ay)", months: 12 },
  { label: "2 Yıl (24 Ay)", months: 24 },
  { label: "5 Yıl (60 Ay)", months: 60 },
  { label: "10 Yıl (120 Ay)", months: 120 },
  { label: "15 Yıl (180 Ay)", months: 180 },
];

const INITIAL_STATE: ProcessActionState = { status: "idle" };

export function CreateRuleDialog({
  triggerLabel = "Yeni Saklama Kuralı",
  triggerVariant = "default",
  triggerSize = "default",
}: {
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
  triggerSize?: "default" | "sm" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const [retentionMonths, setRetentionMonths] = useState<number>(60);
  const [actionChoice, setActionChoice] = useState<string>("Review");
  const [state, formAction, isPending] = useActionState(
    createRuleAction,
    INITIAL_STATE,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message || "Saklama kuralı başarıyla oluşturuldu.");
      setOpen(false);
      router.refresh();
    } else if (state.status === "error") {
      toast.error(state.message || "Kural oluşturulurken bir hata oluştu.");
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={triggerVariant}
            size={triggerSize}
            className="gap-1.5 shadow-sm font-medium"
          />
        }
      >
        <Plus className="size-4" />
        <span>{triggerLabel}</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border">
          <div className="flex items-center gap-2 text-primary">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Gavel className="size-4" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Yeni Saklama Kuralı Oluştur
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Standart Dosya Planı (SDP) ve kurumsal saklama takvimine uygun saklama
            süresi ve tasfiye kararı tanımlayın.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4 py-2">
          {/* Kural Kodu & Adı */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rule-code" className="text-xs font-medium">
                Kural / SDP Kodu <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rule-code"
                name="code"
                placeholder="Örn: SDP-754.01"
                required
                maxLength={100}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Resmi SDP veya birim kodu
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rule-name" className="text-xs font-medium">
                Kural Adı / Konu <span className="text-destructive">*</span>
              </Label>
              <Input
                id="rule-name"
                name="name"
                placeholder="Örn: İmar Ruhsat Dosyaları"
                required
                maxLength={300}
                className="text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Evrak türünü tanımlayan ad
              </p>
            </div>
          </div>

          {/* Saklama Süresi */}
          <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="retention-months" className="text-xs font-medium flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                Saklama Süresi (Ay) <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs font-semibold tabular-nums text-primary">
                {retentionMonths} ay ({Math.floor(retentionMonths / 12)} yıl {retentionMonths % 12 > 0 ? `${retentionMonths % 12} ay` : ""})
              </span>
            </div>

            <Input
              id="retention-months"
              name="retentionMonths"
              type="number"
              min={0}
              max={1200}
              required
              value={retentionMonths}
              onChange={(e) => setRetentionMonths(Number(e.target.value) || 0)}
              className="text-sm bg-background font-mono"
            />

            {/* Hızlı Seçim Butonları */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {MONTH_PRESETS.map((p) => (
                <button
                  key={p.months}
                  type="button"
                  onClick={() => setRetentionMonths(p.months)}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                    retentionMonths === p.months
                      ? "border-primary bg-primary text-primary-foreground font-medium"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Süre Sonu Kararı */}
          <div className="space-y-1.5">
            <Label htmlFor="rule-action" className="text-xs font-medium">
              Süre Sonu Tasfiye Kararı <span className="text-destructive">*</span>
            </Label>
            <select
              id="rule-action"
              name="action"
              value={actionChoice}
              onChange={(e) => setActionChoice(e.target.value)}
              className="w-full rounded-md border border-border bg-background p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            >
              <option value="Review">Gözden Geçir (Süre dolunca komisyon incelemesi)</option>
              <option value="Transfer">Arşive Devir (Süre dolunca kurum arşivine aktarım)</option>
              <option value="Destroy">Fiziksel İmha Değerlendirmesi (Dijital asıllar kalıcı korunur)</option>
              <option value="KeepPermanent">Kalıcı Saklama (Süre uygulanmaz, sürekli arşivde korunur)</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              {actionChoice === "Destroy" && (
                <span className="text-amber-600 font-medium">
                  Dikkat: İmha değerlendirmesinde sadece fiziksel kopya için tutanaklı imha işletilebilir; dijital asıllar ve sürümler mevzuat gereği korunur.
                </span>
              )}
              {actionChoice === "KeepPermanent" && (
                <span className="text-blue-600 font-medium">
                  Kalıcı saklama kararı olan belgelere vade süresi uygulanmaz, doğrudan arşivde muhafaza edilir.
                </span>
              )}
              {actionChoice === "Transfer" && (
                <span>Süre dolduğunda alıcı arşiv birimine dijital ve fiziksel devir paketiyle teslim edilir.</span>
              )}
              {actionChoice === "Review" && (
                <span>Süre bitiminde komisyon toplanarak belgenin geleceği hakkında karar verir.</span>
              )}
            </p>
          </div>

          {/* Mevzuat Bilgilendirmesi */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldAlert className="size-3.5 text-amber-500 shrink-0" />
              <span>Yasal Dayanak & Yetki Uyarısı</span>
            </div>
            <p>
              Süre ve karar için kurumun onaylı saklama planını esas alın. Bu kural kaydı tek başına imha veya devir yetkisi vermez; süre bittiğinde komisyon süreci başlatılır.
            </p>
          </div>

          {state.message && (
            <div
              className={`rounded-lg p-3 text-xs flex items-center gap-2 ${
                state.status === "error"
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {state.status === "error" ? (
                <AlertCircle className="size-4 shrink-0" />
              ) : (
                <CheckCircle2 className="size-4 shrink-0" />
              )}
              <span>{state.message}</span>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="gap-1.5"
            >
              {isPending ? (
                "Kaydediliyor…"
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Kuralı Kaydet</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
