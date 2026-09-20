import { apiGet } from "@/lib/api/api-client";
import type { PagedResult } from "@/features/documents/model/document";
import type { RetentionCaseListItem } from "@/features/retention/model/retention";
import { actionLabels, caseStatusLabels } from "@/features/retention/model/retention";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui/page";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getRetentionCase } from "@/features/retention/api/get-dispositions";
import { CreateProcessForm } from "@/features/retention/components/process-forms";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { canOperate } from "@/features/retention/model/process-permissions";
import {
  Gavel,
  ArrowLeft,
  CalendarClock,
  Lock,
  Clock,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export const metadata = {
  title: "Yeni Değerlendirme Başlat · MBB Dijital Arşiv",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ caseId?: string }>;
}) {
  const { caseId } = await searchParams;

  if (!caseId) {
    const cases = await apiGet<PagedResult<RetentionCaseListItem>>(
      "/retention/cases?page=1&pageSize=100",
      { cache: "no-store" },
    );

    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Yeni Komisyon / Devir Değerlendirmesi"
          description="Değerlendirme başlatmak istediğiniz saklama dosyasını seçin. Yalnızca saklama süresi dolmuş ve üzerinde aktif hukuki bloke bulunmayan dosyalar işleme alınabilir."
          actions={
            <Link
              href="/devir-imha/islemler"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs")}
            >
              <ArrowLeft className="size-3.5" />
              <span>İşlemlere Dön</span>
            </Link>
          }
        />

        {cases.items.length === 0 ? (
          <Panel padded>
            <div className="text-center py-8 space-y-3">
              <FileText className="size-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Henüz sistemde kayıtlı bir saklama dosyası bulunmuyor.
              </p>
              <Link href="/kayit-beyani" className={buttonVariants({ size: "sm" })}>
                Kayıt Beyanı Ekranına Git
              </Link>
            </div>
          </Panel>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cases.items.map((c) => {
              const isEligible =
                c.status === "Eligible" ||
                (c.activeHoldCount === 0 &&
                  c.status !== "Completed" &&
                  c.dueAt !== null &&
                  new Date(c.dueAt) <= new Date());
              const isHeld = c.status === "Held" || c.activeHoldCount > 0;
              const isCompleted = c.status === "Completed";

              return (
                <div
                  key={c.id}
                  className={`flex flex-col justify-between rounded-xl border p-4 shadow-xs transition-all ${
                    isEligible
                      ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500 hover:shadow-md"
                      : "border-border bg-card opacity-80"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {c.ruleCode}
                      </span>
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
                        className="text-[10px]"
                      >
                        {isEligible
                          ? "Değerlendirmeye Uygun"
                          : caseStatusLabels[c.status] ?? c.status}
                      </Badge>
                    </div>

                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p>
                        <strong>Tasfiye Kararı:</strong> {actionLabels[c.action] ?? c.action}
                      </p>
                      <p className="truncate" title={c.documentId}>
                        <strong>Evrak Kimliği:</strong> {c.documentId.slice(0, 16)}…
                      </p>
                      <p>
                        <strong>Vade:</strong>{" "}
                        {c.dueAt ? new Date(c.dueAt).toLocaleDateString("tr-TR") : "Süresiz"}
                      </p>
                      {c.activeHoldCount > 0 && (
                        <p className="text-destructive font-semibold flex items-center gap-1">
                          <Lock className="size-3" />
                          <span>{c.activeHoldCount} aktif hukuki bloke</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <Link
                      href={`/devir-imha/dosyalar/${c.id}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Dosya Detayı
                    </Link>

                    <Link
                      href={`/devir-imha/yeni?caseId=${c.id}`}
                      className={cn(
                        buttonVariants({ size: "sm", variant: isEligible ? "default" : "outline" }),
                        "text-xs gap-1 h-7 px-3",
                      )}
                    >
                      <span>{isEligible ? "Değerlendir" : "İncele"}</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const [item, user] = await Promise.all([
    getRetentionCase(caseId),
    getCurrentUser(),
  ]);

  const eligible =
    item.activeHoldCount === 0 &&
    item.status !== "Completed" &&
    item.dueAt !== null &&
    new Date(item.dueAt) <= new Date();

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      <PageHeader
        title="Değerlendirme Taslağı Oluştur"
        description={`Kural: ${item.ruleCode} · Tasfiye: ${actionLabels[item.action] ?? item.action}`}
        actions={
          <Link
            href="/devir-imha/yeni"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs")}
          >
            <ArrowLeft className="size-3.5" />
            <span>Başka Dosya Seç</span>
          </Link>
        }
      />

      {/* Seçilen Dosya Özeti */}
      <Panel padded title="Seçili Saklama Dosyası Bilgisi">
        <dl className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <dt className="text-muted-foreground">Kural Kodu</dt>
            <dd className="font-semibold font-mono text-primary mt-0.5">{item.ruleCode}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Durum</dt>
            <dd className="mt-0.5">
              <Badge variant={eligible ? "warning" : "outline"} className="text-[10px]">
                {caseStatusLabels[item.status] ?? item.status}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Yasal Saklama Vadesi</dt>
            <dd className="font-medium mt-0.5">
              {item.dueAt ? new Date(item.dueAt).toLocaleDateString("tr-TR") : "Kalıcı / Süresiz"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Etkin Hukuki Bloke</dt>
            <dd className="font-semibold mt-0.5">
              {item.activeHoldCount > 0 ? (
                <span className="text-destructive">{item.activeHoldCount} adet bloke var</span>
              ) : (
                <span className="text-emerald-600">Bloke yok</span>
              )}
            </dd>
          </div>
        </dl>
      </Panel>

      {/* Uygunluk Kontrolü */}
      {!eligible ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-foreground space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Bu dosya henüz tasfiye veya devir değerlendirmesine uygun değildir.</span>
          </div>

          <div className="text-muted-foreground space-y-1 pl-6">
            {item.activeHoldCount > 0 && (
              <p>
                • Dosya üzerinde <strong>{item.activeHoldCount} adet aktif hukuki bloke</strong> bulunmaktadır.
                İşlem başlatılmadan önce hukuki gerekçenin incelenip blokenin kaldırılması gerekir.
              </p>
            )}
            {item.dueAt === null && (
              <p>
                • Bu kural için <strong>Kalıcı Saklama</strong> öngörülmüştür; evrak kurum arşivinde sürekli muhafaza edilir.
              </p>
            )}
            {item.dueAt !== null && new Date(item.dueAt) > new Date() && (
              <p>
                • Dosyanın yasal saklama süresi henüz dolmamıştır. Vade tarihi:{" "}
                <strong>{new Date(item.dueAt).toLocaleDateString("tr-TR")}</strong>.
              </p>
            )}
            {item.status === "Completed" && (
              <p>• Bu dosya için tasfiye işlemi daha önce tamamlanmıştır.</p>
            )}
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Link
              href={`/devir-imha/dosyalar/${item.id}`}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "text-xs")}
            >
              <span>Saklama Dosyasına Git (Bloke Yönetimi)</span>
            </Link>
            <Link
              href="/devir-imha/yeni"
              className={cn(buttonVariants({ size: "sm", variant: "default" }), "text-xs")}
            >
              <span>Uygun Dosya Listesine Dön</span>
            </Link>
          </div>
        </div>
      ) : !canOperate(user, "retention.disposition.prepare") ? (
        <Panel padded>
          <div className="flex items-center gap-2 text-xs text-destructive">
            <ShieldAlert className="size-4" />
            <span>Değerlendirme taslağı oluşturmak için yetkiniz bulunmamaktadır.</span>
          </div>
        </Panel>
      ) : (
        <Panel padded title="Değerlendirme Formu">
          <CreateProcessForm
            caseId={item.id}
            requestId={randomUUID()}
            allowDestroy={item.action === "Destroy"}
          />
        </Panel>
      )}
    </div>
  );
}
