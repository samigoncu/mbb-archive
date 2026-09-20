import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/page";
import { queryAuditEvents } from "@/features/audit/api/get-audit-events";
import { AuditFilters } from "@/features/audit/components/audit-filters";
import {
  AuditChainSummary,
  AuditJournal,
} from "@/features/audit/components/audit-journal";
import { knownAuditEventNames } from "@/features/audit/model/audit";

export const metadata = { title: "Denetim Kayıtları" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ? raw.trim() : undefined;
}

export default async function DenetimPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const take = Number(single(params.take) ?? 100);

  const { events, error } = await queryAuditEvents({
    activity: single(params.activity),
    actor: single(params.actor),
    from: single(params.from),
    to: single(params.to),
    before: single(params.before),
    eventName: single(params.eventName),
    documentId: single(params.documentId),
    take: Number.isFinite(take) ? take : 100,
  });

  // Süzgeç listesi bilinen adlarla sonuçtaki adların birleşimidir; yeni bir
  // olay türü yayınlandığında listede kendiliğinden görünür.
  const eventNames = [
    ...new Set([...knownAuditEventNames, ...events.map((e) => e.eventName)]),
  ].sort();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Denetim Kayıtları"
        description="Kimin hangi belge veya dosya üzerinde ne zaman işlem yaptığını ve işlemin sonucunu inceleyin."
      />

      <Notice icon={ShieldCheck}>
        Bu günlük yalnızca okunur. Kayıtlar eklenir, hiçbir arayüzden
        düzenlenemez veya silinemez. Zincirin tamamı{" "}
        <strong>Servis &amp; Kalite</strong> ekranındaki bütünlük doğrulaması
        ile denetlenir; buradaki bağ göstergesi yalnız listelenen halkaları
        kapsar.
      </Notice>

      <AuditFilters eventNames={eventNames} />

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-card p-6 text-center">
          <p className="text-sm font-medium">Denetim kaydı listelenemedi</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      ) : (
        <>
          <AuditChainSummary events={events} />
          <AuditJournal events={events} />
          {events.length > 0 && (
            <Link
              className="text-primary underline"
              href={`/denetim?${new URLSearchParams(Object.fromEntries(Object.entries({ activity: single(params.activity), eventName: single(params.eventName), documentId: single(params.documentId), actor: single(params.actor), from: single(params.from), to: single(params.to), take: String(take), before: String(events[events.length - 1].sequence) }).filter((entry): entry is [string, string] => !!entry[1])))}`}
            >
              Daha eski kayıtlar
            </Link>
          )}
        </>
      )}
    </div>
  );
}
