import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui/page";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getRetentionCase, getLegalHolds } from "@/features/retention/api/get-dispositions";
import { HoldForm } from "@/features/retention/components/process-forms";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { canOperate } from "@/features/retention/model/process-permissions";
import { actionLabels, caseStatusLabels } from "@/features/retention/model/retention";
import {
  Gavel,
  ArrowLeft,
  FileText,
  Lock,
  Unlock,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";

export const metadata = {
  title: "Saklama Dosyası Detayı · MBB Dijital Arşiv",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, holds, user] = await Promise.all([
    getRetentionCase(id),
    getLegalHolds(id),
    getCurrentUser(),
  ]);

  const manage = canOperate(user, "retention.holds.manage");
  const canPrepare = canOperate(user, "retention.disposition.prepare");

  const isEligible =
    item.activeHoldCount === 0 &&
    item.status !== "Completed" &&
    item.dueAt !== null &&
    new Date(item.dueAt) <= new Date();

  const isHeld = item.status === "Held" || item.activeHoldCount > 0;
  const isCompleted = item.status === "Completed";

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto">
      <PageHeader
        title={`Saklama Dosyası · ${item.ruleCode}`}
        description={`${caseStatusLabels[item.status] ?? item.status} · ${actionLabels[item.action] ?? item.action}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/devir-imha"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs")}
            >
              <ArrowLeft className="size-3.5" />
              <span>Saklama Dosyalarına Dön</span>
            </Link>
            {isEligible && canPrepare && (
              <Link
                href={`/devir-imha/yeni?caseId=${id}`}
                className={cn(
                  buttonVariants({ size: "sm", variant: "default" }),
                  "gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium",
                )}
              >
                <PlayCircle className="size-3.5" />
                <span>Değerlendirme Başlat</span>
              </Link>
            )}
          </div>
        }
      />

      {/* Hızlı Gezinme */}
      <nav aria-label="Dosya bağlantıları" className="flex flex-wrap gap-2 text-xs">
        <Link
          href={`/documents/${item.documentId}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 gap-1.5 text-muted-foreground hover:text-foreground")}
        >
          <FileText className="size-3.5 text-primary" />
          <span>İlgili Belgeyi Aç</span>
        </Link>
        <Link
          href="/devir-imha/islemler"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 gap-1.5 text-muted-foreground hover:text-foreground")}
        >
          <Gavel className="size-3.5 text-primary" />
          <span>Komisyon & Devir İşlemleri</span>
        </Link>
      </nav>

      {/* Dosya Özet Bilgileri */}
      <Panel padded title="Saklama Dosyası Parametreleri">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="rounded-lg bg-muted/20 p-3 border border-border">
            <span className="text-muted-foreground block">Kural / SDP Kodu</span>
            <span className="font-mono font-bold text-sm text-primary mt-1 block">{item.ruleCode}</span>
          </div>

          <div className="rounded-lg bg-muted/20 p-3 border border-border">
            <span className="text-muted-foreground block">Tasfiye Niteliği</span>
            <span className="font-semibold text-sm text-foreground mt-1 block">
              {actionLabels[item.action] ?? item.action}
            </span>
          </div>

          <div className="rounded-lg bg-muted/20 p-3 border border-border">
            <span className="text-muted-foreground block">Dosya Durumu</span>
            <div className="mt-1">
              <Badge
                variant={
                  isHeld
                    ? "destructive"
                    : isEligible
                    ? "warning"
                    : isCompleted
                    ? "success"
                    : "outline"
                }
                className="text-xs"
              >
                {caseStatusLabels[item.status] ?? item.status}
              </Badge>
            </div>
          </div>

          <div className="rounded-lg bg-muted/20 p-3 border border-border">
            <span className="text-muted-foreground block">Yasal Saklama Vadesi</span>
            <span className="font-semibold text-sm tabular-nums text-foreground mt-1 block">
              {item.dueAt ? new Date(item.dueAt).toLocaleDateString("tr-TR") : "Kalıcı Saklama"}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            <strong>Tetiklenme (Beyan) Tarihi:</strong>{" "}
            {new Date(item.triggerAt).toLocaleString("tr-TR")}
          </p>
          <p>
            <strong>Aktif Hukuki Bloke Sayısı:</strong>{" "}
            <span className={item.activeHoldCount > 0 ? "text-destructive font-bold" : "font-semibold"}>
              {item.activeHoldCount}
            </span>
          </p>
        </div>
      </Panel>

      {/* Hukuki Bloke Koyma Paneli */}
      {manage && item.status !== "Completed" && (
        <Panel padded title="Yeni Hukuki Bloke Ekle">
          <p className="text-xs text-muted-foreground mb-3">
            Dava, teftiş veya idari soruşturma kapsamında belgenin tasfiye veya devir sürecini durdurmak için hukuki bloke koyabilirsiniz.
          </p>
          <HoldForm caseId={id} />
        </Panel>
      )}

      {/* Hukuki Bloke Geçmişi */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Lock className="size-4 text-primary" />
          <span>Hukuki Bloke Kayıtları ve Tarihçesi</span>
        </h2>

        {holds.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            Bu dosyada tanımlanmış herhangi bir hukuki bloke kaydı bulunmuyor.
          </div>
        ) : (
          <div className="space-y-3">
            {holds.map((hold) => (
              <Panel padded key={hold.id}>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={hold.isActive ? "destructive" : "outline"} className="text-[10px]">
                        {hold.isActive ? "Etkin Bloke (Korumada)" : "Kaldırıldı"}
                      </Badge>
                      <span className="font-semibold text-foreground">{hold.placedBy}</span>
                    </div>
                    <span className="text-muted-foreground tabular-nums text-[11px]">
                      {new Date(hold.placedAt).toLocaleString("tr-TR")}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap rounded-md bg-muted/30 p-2.5 border border-border text-foreground leading-relaxed">
                    <strong>Gerekçe:</strong> {hold.reason}
                  </p>

                  {hold.releasedAt && (
                    <div className="rounded-md border border-border bg-muted/20 p-2 text-[11px] text-muted-foreground">
                      <span>
                        Kaldıran: <strong>{hold.releasedBy ?? "Bilinmeyen yetkili"}</strong> ·{" "}
                        {new Date(hold.releasedAt).toLocaleString("tr-TR")}
                      </span>
                      {hold.releaseReason && (
                        <p className="mt-1 text-foreground">
                          <strong>Kaldırma Gerekçesi:</strong> {hold.releaseReason}
                        </p>
                      )}
                    </div>
                  )}

                  {hold.isActive && manage && (
                    <div className="mt-3 pt-2 border-t border-border">
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Bu hukuki blokeyi gerekçe belirterek kaldırabilirsiniz:
                      </p>
                      <HoldForm caseId={id} holdId={hold.id} />
                    </div>
                  )}
                </div>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
