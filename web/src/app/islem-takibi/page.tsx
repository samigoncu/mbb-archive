import Link from "next/link";
import { Activity, ArrowUpRight, CheckCircle2, Clock3, FileText, Gauge, TriangleAlert } from "lucide-react";
import { apiGet } from "@/lib/api/api-client";
import { EmptyState, PageHeader } from "@/components/ui/page";
import { getLinkedDocuments } from "@/features/documents/api/get-linked-documents";
import type { PagedResult } from "@/features/documents/model/document";
import { processingStages, ocrStatus, type ProcessingItem } from "@/features/processing/model";
import { ProcessingProgressBar } from "@/features/processing/components/processing-progress-bar";
import { ProcessingRefresh } from "@/features/processing/refresh";
import { ReprocessButton } from "@/features/processing/reprocess-button";
import { getCurrentUser } from "@/features/access/api/get-current-user";
export const metadata = { title: "İşlem Takibi" };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function ProcessingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const canReprocess = Boolean(user?.isAuthenticated && (user.isBootstrapAdministrator || user.permissions.includes("documents.write")));
  const raw = typeof params.stage === "string" ? params.stage : "";
  const stage = Object.hasOwn(processingStages, raw) ? raw : "";
  const page = Math.max(1, parseInt(String(params.page ?? "1"), 10) || 1);
  const query = new URLSearchParams({ page: String(page), pageSize: "25" });
  if (stage) query.set("stage", stage);
  const data = await apiGet<PagedResult<ProcessingItem>>(`/processing/jobs?${query}`, { cache: "no-store" });
  const documents = await getLinkedDocuments([...new Set(data.items.map(job => job.documentId))]);
  const titles = new Map(documents.map(document => [document.id, document.details?.title]));
  const group = typeof params.group === "string" && ["waiting", "completed", "attention"].includes(params.group) ? params.group : "";
  const groupHref = (value: string) => `/islem-takibi?${new URLSearchParams({ stage, page: String(page), ...(group !== value ? { group: value } : {}) })}`;
  const href = (next: number) => `/islem-takibi?${new URLSearchParams({ stage, page: String(next) })}`;
  const date = (value: string) => new Date(value).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const lastPage = Math.max(1, Math.ceil(data.totalCount / data.pageSize));
  const totalItems = data.items.length;
  const completed = data.items.filter(job => job.stage === "Completed").length;
  const attention = data.items.filter(job => ["Failed", "Unsupported"].includes(job.stage)).length;
  const waiting = totalItems - completed - attention;
  const completionRate = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;
  const waitingRate = totalItems > 0 ? Math.round((waiting / totalItems) * 100) : 0;
  const attentionRate = totalItems > 0 ? Math.round((attention / totalItems) * 100) : 0;
  const visibleItems = data.items.filter(job => !group || (group === "completed" ? job.stage === "Completed" : group === "attention" ? ["Failed", "Unsupported"].includes(job.stage) : !["Completed", "Failed", "Unsupported"].includes(job.stage)));

  return <div className="space-y-5">
    <PageHeader title="İşlem Takibi" description="Belgelerin PDF inceleme, OCR, dönüştürme ve indeksleme sonuçlarını takip edin." actions={<ProcessingRefresh hasActiveJobs={waiting > 0} />} />
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm">
      <Activity className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div><p className="font-medium">Güvenlik taramasından sonraki işlemler</p><p className="mt-1 leading-6 text-muted-foreground">İşlem kaydı, güvenlik taraması tamamlanınca oluşur. Her belge sürümü ayrı izlenir. Henüz burada görünmeyen bir yüklemenin güvenlik durumunu belge detayından kontrol edebilirsiniz.</p></div>
    </div>
    <section aria-label="Bu sayfadaki işlem özeti" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-border bg-card p-4 transition-colors">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Genel Tamamlanma</p>
          <Gauge className="size-5 text-primary" aria-hidden />
        </div>
        <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">%{completionRate}</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionRate}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Bu sayfadaki {completed}/{totalItems} işlem bitti</p>
      </div>
      {[
        {groupKey:"waiting",label:"Devam eden / bekleyen",value:waiting,rate:waitingRate,Icon:Clock3,color:"text-sky-700 dark:text-sky-300"},
        {groupKey:"completed",label:"Tamamlanan",value:completed,rate:completionRate,Icon:CheckCircle2,color:"text-emerald-700 dark:text-emerald-300"},
        {groupKey:"attention",label:"İnceleme gereken",value:attention,rate:attentionRate,Icon:TriangleAlert,color:"text-destructive"}
      ].map(({groupKey,label,value,rate,Icon,color}) => (
        <Link
          key={label}
          href={groupHref(groupKey)}
          aria-current={group === groupKey ? "true" : undefined}
          className={`rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${group === groupKey ? "border-primary ring-1 ring-primary" : "border-border"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{label}</p>
            <Icon className={`size-5 ${color}`} aria-hidden />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <p className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
              %{rate} dilim
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {group === groupKey ? "Seçimi kaldır" : "Kayıtları filtrele"}
          </p>
        </Link>
      ))}
    </section>
    <section aria-label="İşlem filtreleri" className="rounded-xl border border-border bg-card p-4">
      <form className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm font-medium">İşlem durumu<select name="stage" defaultValue={stage} className="mt-1.5 block h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Tüm durumlar</option>{Object.entries(processingStages).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="h-10 rounded-lg bg-primary px-4 text-sm text-primary-foreground">Filtrele</button>{stage && <Link href="/islem-takibi" className="px-2 py-2 text-sm text-muted-foreground underline">Temizle</Link>}</form>
    </section>
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold">İşlem kayıtları <span className="ml-2 rounded-full bg-muted px-2.5 py-1 text-sm tabular-nums">{data.totalCount.toLocaleString("tr-TR")}</span></h2><p className="text-xs text-muted-foreground">{stage ? processingStages[stage] : "Tüm durumlar"} · Sayfa {page} / {lastPage}</p></div>
    {group && <p className="text-sm text-muted-foreground">Bu sayfada seçilen gruptaki {visibleItems.length} kayıt gösteriliyor. <Link href={groupHref(group)} className="text-primary underline">Grup filtresini kaldır</Link></p>}
    {!visibleItems.length ? <div className="rounded-xl border border-border bg-card"><EmptyState icon={Activity} title="Bu kapsamda işlem kaydı bulunamadı" description="Durum filtresini değiştirin. Yeni yüklemeler güvenlik taraması tamamlandıktan sonra burada görünür." /></div> : <ul aria-label="İşlem kayıtları" className="space-y-4">
      {visibleItems.map(job => <li key={job.id} className="relative overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
          <div className="flex min-w-0 flex-1 items-start gap-3"><span className="rounded-lg bg-muted p-2.5"><FileText className="size-5 text-primary" aria-hidden /></span><div className="min-w-0"><Link href={`/documents/${job.documentId}`} className="break-words text-sm font-semibold leading-6 hover:text-primary hover:underline after:absolute after:inset-0 focus-visible:outline-none">{titles.get(job.documentId) ?? "Belgeye erişilemiyor"}</Link><p className="mt-1 text-xs leading-5 text-muted-foreground">Başlangıç: {date(job.createdAt)}{job.pageCount ? ` · ${job.pageCount} sayfa` : ""}</p>{job.completedAt && <p className="text-xs leading-5 text-muted-foreground">Bitiş: {date(job.completedAt)}</p>}</div></div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${["Failed","Unsupported"].includes(job.stage) ? "bg-destructive/10 text-destructive" : job.stage === "Completed" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-muted text-foreground"}`}>{processingStages[job.stage] ?? job.stage}</span>
        </div>
        {/* İşlem İlerleme ve % Dilimi Çizelgesi */}
        <div className="border-b border-border/60 bg-muted/20 px-4 py-3.5">
          <ProcessingProgressBar job={job} showSteps={true} />
        </div>
        <dl className="grid gap-4 p-4 sm:grid-cols-3">
          <div><dt className="text-xs text-muted-foreground">OCR / metin tanıma</dt><dd className="mt-2 text-sm font-medium">{ocrStatus(job)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Metin ve PDF çıktısı</dt><dd className="mt-2 space-y-1 text-sm"><p>Metin: {job.hasText ? "Hazır" : "Henüz yok"}</p><p>PDF: {job.hasPdf ? "Hazır" : job.mimeType === "application/pdf" ? "Orijinal PDF" : "Henüz yok"}</p></dd></div>
          <div><dt className="text-xs text-muted-foreground">Arama indeksleme</dt><dd className="mt-2 text-sm font-medium">{job.stage === "Completed" ? "Tamamlandı" : job.stage === "AwaitingIndex" ? "Sonuç bekleniyor" : job.stage === "Failed" ? "Tamamlanmadı" : "Henüz tamamlanmadı"}</dd></div>
        </dl>
        {(job.failureDetail || job.failureCode) && <div className="mx-4 mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3"><p className="text-sm font-medium text-destructive">İşlem açıklaması</p>{job.failureDetail && <p className="mt-2 break-words text-sm leading-6">{job.failureDetail}</p>}{job.failureCode && <details className="relative z-10 mt-2 text-xs text-muted-foreground"><summary className="cursor-pointer">Teknik hata kodu</summary><p className="mt-2 break-all font-mono">{job.failureCode}</p></details>}</div>}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-4 py-3">{canReprocess && ["Completed","Failed"].includes(job.stage) && <ReprocessButton documentId={job.documentId} jobId={job.id}/>}<Link href={`/documents/${job.documentId}`} className="relative z-10 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">Belgeyi incele<ArrowUpRight className="size-4" aria-hidden /></Link></div>
      </li>)}
    </ul>}
    <nav aria-label="İşlem sayfaları" className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Sayfa {page} / {lastPage}</span><div className="flex gap-3">{page > 1 && <Link className="rounded-lg border px-3 py-2 hover:bg-muted" href={href(page-1)}>Önceki</Link>}{page < lastPage && <Link className="rounded-lg border px-3 py-2 hover:bg-muted" href={href(page+1)}>Sonraki</Link>}</div></nav>
  </div>;
}
