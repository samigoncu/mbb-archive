import { Suspense } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  FolderPlus,
  History,
  ClipboardList,
  Activity,
  FileText,
  ArrowUpRight,
  MapPin,
  ScanLine,
  Search,
  ShieldAlert,
} from "lucide-react";
import { EmptyState, Panel } from "@/components/ui/page";
import {
  auditEventLabel,
  auditEventTimestamp,
} from "@/features/audit/model/audit";
import type { HomeHubData } from "@/features/dashboard/api/get-home-hub";
import { ExecutiveDashboardView } from "@/features/dashboard/components/executive-dashboard-view";
import {
  actionLabels,
  caseStatusLabels,
} from "@/features/retention/model/retention";
import { SearchBar } from "@/features/search/components/search-bar";
import type { CurrentUser } from "@/features/access/model/current-user";
import { defaultBranding } from "@/features/branding/model/branding";

const quickActions = [
  {href:"/documents",icon:FileText,title:"Tüm Belgeler",description:"Birim ve SDP’ye göre belgelere ulaşın"},
  {href:"/gorevlerim",icon:ClipboardList,title:"Görevlerim",description:"Atanan işleri ve son tarihleri takip edin"},
  {href:"/islem-takibi",icon:Activity,title:"İşlem Takibi",description:"OCR ve indeksleme sonuçlarını inceleyin"},
  {
    href: "/tarama",
    icon: ScanLine,
    title: "Belge Yükle",
    description: "Tara, indeksle ve arşive aktar",
  },
  {
    href: "/dosya-islemleri",
    icon: FolderPlus,
    title: "Fiziksel Dosyalar",
    description: "Klasörleri ve fiziksel konumlarını inceleyin",
  },
  {
    href: "/arama",
    icon: Search,
    title: "Genel Arama",
    description: "İçerik ve üstveride ara",
  },
  {
    href: "/arsiv-yerlesimi",
    icon: MapPin,
    title: "Arşiv Yerleşimi",
    description: "Depo doluluğunu görüntüle",
  },
];

export function HomeHub({
  data,
  user,
  siteTitle = defaultBranding.siteTitle,
}: {
  data: HomeHubData;
  user: CurrentUser | null;
  siteTitle?: string;
}) {
  const { summary, retentionCases, eligibleRetentionCount, recentActivity } = data;

  const attention = [
    {
      href: "/odunc?overdueOnly=true",
      icon: Clock,
      label: "Gecikmiş iade",
      count: summary.loans.overdue,
    },
    {
      href: "/devir-imha?status=Eligible",
      icon: ShieldAlert,
      label: "Saklama süresi dolmuş kayıt",
      count: eligibleRetentionCount,
    },
    {
      href: "/islem-takibi?stage=Failed",
      icon: AlertTriangle,
      label: "Başarısız işleme işi",
      count: summary.operations?.processingFailed ?? 0,
    },
  ].filter((entry) => entry.count > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* KARŞILAMA — arama ana odak */}
      <section className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-8">
        <div>
          <p className="mb-2 text-xs font-medium text-primary">{siteTitle}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Arşiv çalışma alanı</h1>
          <p className="mt-2 text-sm text-muted-foreground">{greeting()} · {new Date().toLocaleDateString("tr-TR", {timeZone:"Europe/Istanbul",day:"numeric",month:"long",year:"numeric"})}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Kurumsal bilgiye tek noktadan ulaşın. Bir belge, karar, dosya veya
            evrak içeriğinde arama yapabilirsiniz.
          </p>
        </div>

        <Suspense fallback={<div className="h-11 rounded-md border border-border bg-muted/40" />}>
          <SearchBar />
        </Suspense>

        <p className="text-xs text-muted-foreground">Belge başlığı veya içeriğiyle arayın. Tarih ve alan filtreleri için <Link href="/arama?mode=advanced" className="font-medium text-primary underline">gelişmiş aramayı açın</Link>.</p>
      </section>

      <ExecutiveDashboardView summary={summary} />
      <h2 className="text-base font-semibold">Hızlı erişim</h2>
      {/* HIZLI AKSİYONLAR */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          const colors = ["border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40", "border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40", "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40", "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40", "border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/40", "border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40", "border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/40"];

          return (
            <Link
              key={action.href}
              href={action.href}
              className={`group flex items-start gap-3 rounded-xl border p-4 shadow-xs transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${colors[index % colors.length]}`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {action.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {action.description}
                </span>
              </span>
            </Link>
          );
        })}
      </section>

      {/* DİKKAT GEREKTİRENLER — yalnız gerçekten bekleyen iş varsa çizilir */}
      {attention.length > 0 && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {attention.map((entry) => {
            const Icon = entry.icon;

            return (
              <Link
                key={entry.label}
                href={entry.href}
                className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="size-4 shrink-0 text-destructive" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {entry.label}
                </span>
                <span className="shrink-0 text-lg font-black tabular-nums text-destructive">
                  {entry.count}
                </span>
              </Link>
            );
          })}
        </section>
      )}

      {/* YAKLAŞAN SAKLAMA İŞLEMLERİ */}
      {retentionCases.length > 0 && (
        <Panel
          title="Yaklaşan Saklama İşlemleri"
          description="Süresi dolan ve planlanan kayıtlar"
          actions={
            <Link
              href="/devir-imha"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Tümü →
            </Link>
          }
        >
          <ul className="divide-y divide-border">
            {retentionCases.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0">
                  <Link href={`/devir-imha/dosyalar/${item.id}`} className="text-sm font-semibold text-primary hover:underline">{item.ruleCode}</Link>
                  <span className="ml-2 text-muted-foreground">
                    {actionLabels[item.action] ?? item.action}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  <span>{caseStatusLabels[item.status] ?? item.status}</span>
                  {item.dueAt ? <span>{item.dueAt.slice(0, 10)}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* KURUM ÖZETİ VE DAĞILIMLAR */}
      <Panel title="Son eklenen belgeler" description="Erişim yetkiniz kapsamındaki en yeni kayıtlar" actions={<Link href="/documents" className="text-xs font-medium text-primary hover:underline">Tüm belgeler →</Link>}>
        {summary.documents.recent.length ? <ul className="divide-y divide-border">{summary.documents.recent.slice(0,6).map(document=><li key={document.id}><Link href={`/documents/${document.id}`} className="flex items-start gap-3 px-4 py-4 hover:bg-muted/30"><FileText className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden /><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{document.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(document.createdAt).toLocaleDateString("tr-TR",{timeZone:"Europe/Istanbul"})} · {document.versionCount} sürüm</p></div><ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden /></Link></li>)}</ul> : <EmptyState icon={FileText} title="Gösterilecek belge yok" description="Erişebildiğiniz belgeler eklendikçe burada görünür." />}
      </Panel>


      {/* SON SİSTEM HAREKETLERİ — denetim izinden */}
      <Panel
        title="Son Sistem Hareketleri"
        description="Denetim izinden, en yeni kayıtlar"
      >
        {recentActivity.length === 0 ? (
          <EmptyState
            icon={History}
            title="Hareket görüntülenemiyor"
            description="Denetim izi boş ya da bu kayıtları görme yetkiniz yok."
          />
        ) : (
          <ul className="divide-y divide-border">
            {recentActivity.map((event) => (
              <li
                key={event.messageId}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {auditEventLabel(event.eventName)}
                </span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  {event.documentId ? (
                    <Link
                      href={`/documents/${event.documentId}`}
                      className="font-mono hover:underline"
                    >
                      Belgeyi aç
                    </Link>
                  ) : null}
                  <time dateTime={auditEventTimestamp(event)}>
                    {new Date(auditEventTimestamp(event)).toLocaleString("tr-TR",{timeZone:"Europe/Istanbul",dateStyle:"short",timeStyle:"short"})}
                  </time>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** Sunucu saatine göre; karşılama metni tek kaynaktan üretilir. */
function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("tr-TR",{timeZone:"Europe/Istanbul",hour:"numeric",hourCycle:"h23"}).format(new Date()));

  if (hour < 12) return "Günaydın";
  if (hour < 18) return "İyi günler";
  return "İyi akşamlar";
}
