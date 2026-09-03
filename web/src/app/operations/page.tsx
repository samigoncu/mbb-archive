import { AlertTriangle, Boxes, Inbox, ServerCrash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Panel } from "@/components/ui/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import { getOperationsOverview } from "@/features/operations/api";
import type { OperationalHealth } from "@/features/operations/types";

export const metadata = { title: "Operasyon Merkezi · MBB Kurumsal Arşiv" };

const healthLabels: Record<OperationalHealth, string> = {
  Healthy: "Sağlıklı",
  Degraded: "Bozulmuş",
  Unhealthy: "Hatalı",
  Unknown: "Bilinmiyor",
};

const healthVariants: Record<
  OperationalHealth,
  "success" | "warning" | "destructive" | "outline"
> = {
  Healthy: "success",
  Degraded: "warning",
  Unhealthy: "destructive",
  Unknown: "outline",
};

export default async function OperationsPage() {
  const overview = await getOperationsOverview();

  const deadLetters = overview.queues
    .filter((queue) => queue.isDeadLetterQueue)
    .reduce((sum, queue) => sum + queue.total, 0);
  const readyMessages = overview.queues.reduce((sum, queue) => sum + queue.ready, 0);
  const incidents = overview.components.flatMap((component) =>
    component.issues.map((issue) => ({ ...issue, component: component.component })),
  );
  const critical = incidents.filter((item) => item.severity === "Unhealthy").length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Operasyon Merkezi"
        description="Kuyruklar, bileşen sağlığı, dış bağımlılıklar ve açık olaylar."
        actions={
          <Badge variant={healthVariants[overview.overallHealth]}>
            Sistem: {healthLabels[overview.overallHealth]}
          </Badge>
        }
      />

      <section aria-label="Operasyon özeti" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Bekleyen Mesaj"
          value={readyMessages}
          hint="Kuyruklarda işlenmeyi bekleyen"
          icon={Inbox}
        />
        <StatTile
          label="Ölü Mektup"
          value={deadLetters}
          hint="İşlenemeyen mesaj"
          icon={ServerCrash}
          tone={deadLetters > 0 ? "danger" : "neutral"}
        />
        <StatTile
          label="Kritik Uyarı"
          value={critical}
          hint="Hatalı bileşen"
          icon={AlertTriangle}
          tone={critical > 0 ? "danger" : "neutral"}
        />
        <StatTile
          label="Açık Olay"
          value={incidents.length}
          hint="Bileşen bildirimi"
          icon={Boxes}
          tone={incidents.length > 0 ? "warning" : "neutral"}
        />
      </section>

      <Panel title="Bileşen Sağlığı" description="Her modül kendi anlık görüntüsünü katkılar.">
        <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
          {overview.components.map((component) => (
            <article key={component.component} className="bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate font-mono text-xs font-semibold">
                  {component.component}
                </h3>
                <Badge variant={healthVariants[component.health]}>
                  {healthLabels[component.health]}
                </Badge>
              </div>
              <dl className="mt-2 flex flex-col gap-1">
                {component.measurements.slice(0, 5).map((item) => (
                  <div key={item.name} className="flex justify-between gap-2 text-xs">
                    <dt className="truncate text-muted-foreground">{item.name}</dt>
                    <dd className="shrink-0 tabular-nums">
                      {item.value} <span className="text-muted-foreground">{item.unit}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Kuyruk ve Ölü Mektup">
        {overview.queues.length === 0 ? (
          <EmptyState icon={Inbox} title="Kuyruk verisi alınamadı" />
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kuyruk</TableHead>
                  <TableHead className="w-24 text-right">Hazır</TableHead>
                  <TableHead className="w-28 text-right">Onaysız</TableHead>
                  <TableHead className="w-24 text-right">Toplam</TableHead>
                  <TableHead className="w-28 text-right">Tüketici</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.queues.map((queue) => (
                  <TableRow key={queue.name}>
                    <TableCell className="font-mono text-xs">
                      {queue.name}
                      {queue.isDeadLetterQueue ? (
                        <Badge variant="outline" className="ml-2">
                          DLQ
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{queue.ready}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {queue.unacknowledged}
                    </TableCell>
                    <TableCell
                      className={
                        queue.isDeadLetterQueue && queue.total > 0
                          ? "text-right font-medium tabular-nums text-destructive"
                          : "text-right tabular-nums"
                      }
                    >
                      {queue.total}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {queue.consumers}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Dış Bağımlılıklar" padded>
          <ul className="flex flex-col gap-2.5">
            {overview.dependencies.map((dependency) => (
              <li key={dependency.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{dependency.name}</span>
                  <Badge variant={healthVariants[dependency.health]}>
                    {healthLabels[dependency.health]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{dependency.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Açık Olaylar">
          {incidents.length === 0 ? (
            <EmptyState title="Açık olay yok" description="Tüm bileşenler bildirimsiz." />
          ) : (
            <ul className="divide-y divide-border">
              {incidents.map((incident) => (
                <li key={`${incident.component}-${incident.code}`} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold">
                      {incident.component}
                    </span>
                    <Badge variant={healthVariants[incident.severity]}>
                      {healthLabels[incident.severity]}
                    </Badge>
                    <span className="font-mono text-2xs text-muted-foreground">
                      {incident.code}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{incident.message}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
