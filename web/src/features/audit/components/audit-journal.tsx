import Link from "next/link";
import { Link2, Link2Off, HelpCircle, ScrollText } from "lucide-react";
import { EmptyState, Panel } from "@/components/ui/page";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  auditActorLabel,
  auditOutcomeLabel,
  auditResourceLabel,
  auditResourceKind,
  auditChainLinks,
  auditEventLabel,
  auditEventTimestamp,
  type AuditEvent,
  type ChainLink,
} from "@/features/audit/model/audit";

const chainPresentation: Record<
  ChainLink,
  { icon: typeof Link2; label: string; className: string }
> = {
  linked: {
    icon: Link2,
    label: "Önceki halkaya bağlı",
    className: "text-emerald-600 dark:text-emerald-400",
  },
  broken: {
    icon: Link2Off,
    label: "Zincir bağı uyuşmuyor",
    className: "text-destructive",
  },
  unchecked: {
    icon: HelpCircle,
    label: "Önceki halka bu listede yok, bağ denetlenemedi",
    className: "text-muted-foreground/60",
  },
};

/**
 * Denetim izi append-only ve hash zincirlidir; ekran bu yüzden sıralamayı ve
 * halka bağını görünür kılar. Kayıt düzenleme veya silme eylemi bilinçli olarak
 * yoktur.
 */
export function AuditJournal({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={ScrollText}
          title="Bu süzgeçle denetim kaydı yok"
          description="Süzgeci genişletin veya kayıt sayısını artırın."
        />
      </Panel>
    );
  }

  const links = auditChainLinks(events);

  return (
    <Panel
      title="Denetim izi"
      description={`${events.length} kayıt · yeniden eskiye`}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Sıra</TableHead>
              <TableHead className="w-10" aria-label="Zincir" />
              <TableHead>Kullanıcı</TableHead>
              <TableHead>İşlem</TableHead>
              <TableHead className="w-44">Zaman</TableHead>
              <TableHead className="min-w-64">Belge / Dosya</TableHead>
              <TableHead>Sonuç</TableHead>
              <TableHead>Ayrıntı</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => {
              const chain =
                chainPresentation[links.get(event.sequence) ?? "unchecked"];
              const ChainIcon = chain.icon;

              return (
                <TableRow key={event.sequence}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {event.sequence}
                  </TableCell>
                  <TableCell>
                    <ChainIcon
                      className={`size-3.5 ${chain.className}`}
                      aria-label={chain.label}
                    />
                  </TableCell>
                  <TableCell className="text-sm">
                    {event.actor ? <Link href={`/denetim?actor=${encodeURIComponent(event.actor)}`} className="font-medium hover:underline">{auditActorLabel(event)}</Link> : auditActorLabel(event)}
                  </TableCell>
                  <TableCell className="text-sm">{auditEventLabel(event.eventName)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatTimestamp(auditEventTimestamp(event))}
                  </TableCell>
                  <TableCell>
                    <span className="block text-xs text-muted-foreground">{auditResourceKind(event)}</span>
                    {event.resourceName && event.resourceUrl ? (
                      <Link prefetch={false} href={event.resourceUrl} className="text-sm font-medium text-primary hover:underline">{auditResourceLabel(event)}</Link>
                    ) : <span className="text-sm">{auditResourceLabel(event)}</span>}
                    {event.documentId && <Link href={`/denetim?documentId=${event.documentId}`} className="mt-1 block text-xs text-primary hover:underline">Belgenin işlem geçmişi</Link>}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={event.outcome === "denied" || event.outcome === "failed" ? "destructive" : "secondary"}>{auditOutcomeLabel(event.outcome)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-72 text-xs">
                    <details>
                      <summary className="cursor-pointer whitespace-nowrap">Teknik ayrıntılar</summary>
                      <dl className="mt-2 grid gap-1 break-all text-muted-foreground">
                        <dt>Kullanıcı kimliği</dt><dd>{event.actor ?? "Kaydedilmemiş"}</dd>
                        <dt>Kaynak kimliği</dt><dd>{event.entityId ?? event.resourceId ?? event.documentId ?? "Kaydedilmemiş"}</dd>
                        <dt>Olay kodu</dt><dd>{event.eventName}</dd>
                        <dt>İstemci IP</dt><dd>{event.ipAddress ?? "Kaydedilmemiş"}</dd>
                        <dt>İz kimliği</dt><dd>{event.correlationId ?? "Kaydedilmemiş"}</dd>
                        <dt>Girdi özeti</dt><dd className="font-mono">{event.entryHash}</dd>
                      </dl>
                      {event.resourceName && <p className="mt-2 text-muted-foreground">Belge / dosya adı, erişebildiğiniz güncel kayıttan gösterilir.</p>}
                    </details>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}

/** Zincirin bu sayfadaki durumunu özetler. */
export function AuditChainSummary({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) return null;

  const links = [...auditChainLinks(events).values()];
  const broken = links.filter((link) => link === "broken").length;
  const unchecked = links.filter((link) => link === "unchecked").length;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge variant={broken > 0 ? "destructive" : "success"}>
        {broken > 0
          ? `${broken} halka bağı uyuşmuyor`
          : "Listelenen halkalar bağlı"}
      </Badge>
      {unchecked > 0 ? (
        <span className="text-muted-foreground">
          {unchecked} kayıt için önceki halka bu listede yok; bağ denetlenemedi.
        </span>
      ) : null}
    </div>
  );
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("tr-TR", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "Europe/Istanbul",
      });
}
