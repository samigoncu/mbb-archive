import Link from "next/link";
import { CalendarClock, Gavel, Lock, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import {
  countRetentionCases,
  getRetentionCases,
  getRetentionRules,
  retentionPageSize,
} from "@/features/retention/api/get-retention";
import {
  actionLabels,
  caseStatusLabels,
} from "@/features/retention/model/retention";
import { EmptyState, Notice, PageHeader, Panel } from "@/components/ui/page";

export const metadata = { title: "Devir ve İmha · MBB Kurumsal Arşiv" };

const dateOnly = new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" });

const views = [
  { key: "", label: "Tümü" },
  { key: "Eligible", label: "Süresi Dolan" },
  { key: "Held", label: "Hukuki Blokede" },
  { key: "Scheduled", label: "Planlanan" },
] as const;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DevirImhaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = single(params.status) ?? "";
  const page = Number.parseInt(single(params.page) ?? "1", 10) || 1;

  const [cases, rules, eligible, held, scheduled] = await Promise.all([
    getRetentionCases(page, status || undefined),
    getRetentionRules(),
    countRetentionCases("Eligible"),
    countRetentionCases("Held"),
    countRetentionCases("Scheduled"),
  ]);

  const lastPage = Math.max(1, Math.ceil(cases.totalCount / retentionPageSize));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Devir ve İmha"
        description="Saklama süreleri, hukuki blokeler ve tasfiye uygunluğu."
      />

      <section aria-label="Tasfiye özeti" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Süresi Dolan"
          value={eligible}
          hint="Komisyon değerlendirmesi bekliyor"
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
        <StatTile label="Planlanan" value={scheduled} hint="Süresi dolmamış" icon={ShieldAlert} />
        <StatTile
          label="Saklama Kuralı"
          value={rules.length}
          hint="Tanımlı kural"
          icon={Gavel}
        />
      </section>

      <Notice icon={Gavel}>
        <p>
          <strong className="font-medium text-foreground">
            İmha yürütme bu ekrandan yapılamaz.
          </strong>{" "}
          Saklama süresinin dolması silme yetkisi değildir; imha ve devir ayrı bir
          kontrollü komut ve imha komisyonu onay akışı gerektirir. Bu ekran uygunluk
          durumunu ve hukuki blokeleri gösterir.
        </p>
      </Notice>

      <Tabs defaultValue="cases">
        <TabsList>
          <TabsTrigger value="cases">Tasfiye Kayıtları</TabsTrigger>
          <TabsTrigger value="rules">Saklama Kuralları</TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="mt-3 flex flex-col gap-3">
          <nav aria-label="Durum filtresi" className="flex flex-wrap gap-1">
            {views.map((view) => (
              <Link
                key={view.key || "all"}
                href={view.key ? `/devir-imha?status=${view.key}` : "/devir-imha"}
                aria-current={status === view.key ? "page" : undefined}
                className={
                  status === view.key
                    ? "inline-flex min-h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                    : "inline-flex min-h-9 items-center rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"
                }
              >
                {view.label}
              </Link>
            ))}
          </nav>

          {cases.items.length === 0 ? (
            <Empty text="Bu filtreye uyan tasfiye kaydı yok. Kayıtlar, belgeler arşive devredildikçe otomatik oluşur." />
          ) : (
            <Panel>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Kural</TableHead>
                    <TableHead className="w-36">Tasfiye</TableHead>
                    <TableHead className="w-36">Durum</TableHead>
                    <TableHead className="w-32">Tetiklenme</TableHead>
                    <TableHead className="w-32">Vade</TableHead>
                    <TableHead className="w-24 text-right">Bloke</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {item.ruleCode}
                      </TableCell>
                      <TableCell>{actionLabels[item.action] ?? item.action}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === "Held"
                              ? "destructive"
                              : item.status === "Eligible"
                                ? "warning"
                                : "outline"
                          }
                        >
                          {caseStatusLabels[item.status] ?? item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {dateOnly.format(new Date(item.triggerAt))}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {item.dueAt ? dateOnly.format(new Date(item.dueAt)) : "süresiz"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.activeHoldCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Panel>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{cases.totalCount} kayıt</p>
            {lastPage > 1 ? (
              <nav aria-label="Sayfalama" className="flex items-center gap-3 text-sm">
                {page > 1 ? (
                  <Link href={pageHref(status, page - 1)} className="hover:underline">
                    Önceki
                  </Link>
                ) : null}
                <span className="tabular-nums">
                  {page} / {lastPage}
                </span>
                {page < lastPage ? (
                  <Link href={pageHref(status, page + 1)} className="hover:underline">
                    Sonraki
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-3">
          {rules.length === 0 ? (
            <Empty text="Henüz saklama kuralı tanımlanmamış." />
          ) : (
            <Panel>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Kod</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead className="w-32 text-right">Saklama</TableHead>
                    <TableHead className="w-36">Tasfiye</TableHead>
                    <TableHead className="w-24 text-right">Kayıt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {rule.code}
                      </TableCell>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {rule.retentionMonths} ay
                      </TableCell>
                      <TableCell>{actionLabels[rule.action] ?? rule.action}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {rule.caseCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Panel>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function pageHref(status: string, page: number): string {
  const params = new URLSearchParams({ page: String(page) });

  if (status) {
    params.set("status", status);
  }

  return `/devir-imha?${params}`;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
