import Link from "next/link";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { canOperate } from "@/features/retention/model/process-permissions";
import {
  CalendarClock,
  Gavel,
  Lock,
  ShieldAlert,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import {
  countRetentionCases,
  getRetentionCases,
  getRetentionRules,
} from "@/features/retention/api/get-retention";
import { Notice, PageHeader } from "@/components/ui/page";
import { CreateRuleDialog } from "@/features/retention/components/create-rule-dialog";
import { RetentionDashboardView } from "@/features/retention/components/retention-dashboard-view";

export const metadata = { title: "Saklama ve İmha · MBB Dijital Arşiv" };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DevirImhaPage({ searchParams }: PageProps) {
  const [casesResult, rules, eligible, held, scheduled, completed, currentUser] =
    await Promise.all([
      getRetentionCases(1, undefined, 100),
      getRetentionRules(),
      countRetentionCases("Eligible"),
      countRetentionCases("Held"),
      countRetentionCases("Scheduled"),
      countRetentionCases("Completed"),
      getCurrentUser(),
    ]);

  const canManageRules = canOperate(currentUser, "retention.rules.manage");
  const canPrepareDisposition = canOperate(
    currentUser,
    "retention.disposition.prepare",
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Saklama ve İmha"
        description="Saklama süreleri, hukuki blokeler, kurallar ve yasal tasfiye süreçleri."
        actions={
          <div className="flex items-center gap-2">
            {canManageRules && (
              <CreateRuleDialog
                triggerLabel="Yeni Saklama Kuralı"
                triggerVariant="default"
              />
            )}
            <Link
              href="/devir-imha/islemler"
              className={cn(buttonVariants({ variant: "outline" }), "gap-1.5")}
            >
              <Gavel className="size-4 text-primary" />
              <span>Komisyon ve Devir İşlemleri</span>
            </Link>
          </div>
        }
      />

      {/* KPI İstatistik Kartları */}
      <section
        aria-label="Tasfiye özeti"
        className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      >
        <StatTile
          label="Süresi Dolan"
          value={eligible}
          hint="Komisyon bekliyor"
          icon={CalendarClock}
          tone={eligible > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Hukuki Blokede"
          value={held}
          hint="Tasfiye edilemez"
          icon={Lock}
          tone={held > 0 ? "danger" : "neutral"}
        />
        <StatTile
          label="Planlanan"
          value={scheduled}
          hint="Süresi dolmamış"
          icon={ShieldAlert}
        />
        <StatTile
          label="Tamamlananlar"
          value={completed}
          hint="Tasfiye / devir bitti"
          icon={CheckCircle2}
          tone={completed > 0 ? "success" : "neutral"}
        />
        <StatTile
          label="Saklama Kuralı"
          value={rules.length}
          hint="Tanımlı kural sayısı"
          icon={Gavel}
        />
      </section>

      {/* Yasal Uyarı Bildirimi */}
      <Notice icon={Gavel}>
        <p>
          <strong className="font-semibold text-foreground">
            İmha yürütme doğrudan yapılamaz.
          </strong>{" "}
          Saklama süresinin dolması silme yetkisi değildir. Süresi dolan dosyada
          komisyon değerlendirmesi başlatılır; üye görüşleri ve nihai onay
          tamamlandıktan sonra tutanaklı fiziksel imha veya kurumsal arşiv devri
          yürütülür. Belgelerin dijital asılları ve kriptografik özetleri MBB
          bünyesinde kalıcı olarak korunur.
        </p>
      </Notice>

      {/* İnteraktif Arama, Filtreleme ve Tablo Paneli */}
      <RetentionDashboardView
        cases={casesResult.items}
        rules={rules}
        canManageRules={canManageRules}
        canPrepareDisposition={canPrepareDisposition}
      />
    </div>
  );
}
