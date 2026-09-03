import {
  Activity,
  Archive,
  FileStack,
  FileText,
  HandCoins,
  Scan,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  getDashboardData,
  measurement,
} from "@/features/dashboard/api/get-dashboard";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import type { OperationalHealth } from "@/features/operations/types";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Ana Sayfa · MBB Kurumsal Arşiv" };

const healthLabels: Record<OperationalHealth, string> = {
  Healthy: "Sağlıklı",
  Degraded: "Bozulmuş",
  Unhealthy: "Hatalı",
  Unknown: "Bilinmiyor",
};

const healthVariants: Record<OperationalHealth, "success" | "warning" | "destructive" | "outline"> = {
  Healthy: "success",
  Degraded: "warning",
  Unhealthy: "destructive",
  Unknown: "outline",
};

const quickActions = [
  { href: "/dosya-islemleri", label: "Dosya İşlemleri", icon: FileStack },
  { href: "/arama", label: "Belge Ara", icon: Search },
  { href: "/odunc", label: "Ödünç Ver", icon: HandCoins },
  { href: "/documents", label: "Belgeler", icon: FileText },
];

export default async function HomePage() {
  const { overview, documentCount } = await getDashboardData();

  const folders = measurement(overview, "physical_archive", "folders");
  const overdueLoans = measurement(overview, "physical_archive", "loans_overdue");
  const indexed = measurement(overview, "search", "projection_documents");
  const auditEntries = measurement(overview, "audit", "entries");
  const securityPending = measurement(overview, "documents", "security_pending");
  const processingActive = measurement(overview, "processing", "jobs_active");
  const processingFailed = measurement(overview, "processing", "jobs_failed");
  const indexPending = measurement(overview, "search", "index_pending");

  const deadLetterTotal = overview.queues
    .filter((queue) => queue.isDeadLetterQueue)
    .reduce((total, queue) => total + queue.total, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ana Sayfa"
        description="Arşivin güncel durumu ve operasyonel göstergeler."
        actions={
          <Badge variant={healthVariants[overview.overallHealth]}>
            Sistem: {healthLabels[overview.overallHealth]}
          </Badge>
        }
      />

      <section aria-label="Arşiv özeti" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Fiziksel Klasör"
          value={folders}
          hint="Rafta kayıtlı dosya"
          icon={Archive}
          href="/dosya-islemleri"
        />
        <StatTile
          label="Dijital Belge"
          value={documentCount}
          hint="Kayıtlı belge"
          icon={FileText}
          href="/documents"
        />
        <StatTile
          label="Aramaya İndekslenen"
          value={indexed}
          hint="Tam metin aranabilir"
          icon={Search}
          tone="success"
          href="/arama"
        />
        <StatTile
          label="Geciken Ödünç"
          value={overdueLoans}
          hint="İade ihtarı gerekiyor"
          icon={HandCoins}
          tone={overdueLoans && overdueLoans > 0 ? "danger" : "neutral"}
          href="/odunc"
        />
      </section>

      <section aria-label="İşlem kuyruğu" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Güvenlik Taraması Bekleyen"
          value={securityPending}
          hint="Yüklenen, taranmamış dosya"
          icon={ShieldCheck}
          tone={securityPending && securityPending > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="İşlemde"
          value={processingActive}
          hint="OCR / PDF inceleme"
          icon={Scan}
        />
        <StatTile
          label="İndeksleme Kuyruğu"
          value={indexPending}
          hint="Aramaya aktarılmayı bekleyen"
          icon={Activity}
          tone={indexPending && indexPending > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Ölü Mektup"
          value={deadLetterTotal}
          hint="İşlenemeyen mesaj"
          icon={Activity}
          tone={deadLetterTotal > 0 ? "danger" : "neutral"}
          href="/operations"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-flat">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
            Bileşen Sağlığı
          </h2>
          <ul className="divide-y divide-border">
            {overview.components.map((component) => (
              <li
                key={component.component}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
              >
                <span className="font-mono text-xs font-medium">
                  {component.component}
                </span>
                <span className="flex flex-wrap items-center gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {component.measurements
                      .map((item) => `${item.name}=${item.value}`)
                      .join(" · ")}
                  </span>
                  <Badge variant={healthVariants[component.health]}>
                    {healthLabels[component.health]}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-flat">
          <h2 className="text-sm font-semibold">Hızlı İşlemler</h2>
          <ul className="mt-3 flex flex-col gap-1.5">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    className="flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    {action.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <h2 className="mt-5 text-sm font-semibold">Bağımlılıklar</h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {overview.dependencies.map((dependency) => (
              <li
                key={dependency.name}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="truncate text-muted-foreground">{dependency.name}</span>
                <Badge variant={healthVariants[dependency.health]}>
                  {healthLabels[dependency.health]}
                </Badge>
              </li>
            ))}
          </ul>

          <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            Denetim zincirinde {auditEntries?.toLocaleString("tr-TR") ?? "—"} kayıt,
            işlemde başarısız {processingFailed ?? "—"} iş.
          </p>
        </div>
      </section>
    </div>
  );
}
