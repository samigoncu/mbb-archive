import Link from "next/link";
import { apiGet } from "@/lib/api/api-client";
import { PageHeader, Panel } from "@/components/ui/page";
import { ExportCsvButton } from "@/components/export-csv-button";
import { auditEventLabel } from "@/features/audit/model/audit";
type Row = {
  actor: string | null;
  eventName: string;
  count: number;
  firstAt: string;
  lastAt: string;
};
export const metadata = {title: "Kullanıcı ve İşlem Raporları"};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; actor?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  const from =
    params.from ||
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
  const to =
    params.to || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const query = new URLSearchParams({
    from,
    to,
    ...(params.actor ? { actor: params.actor } : {}),
  });
  let result: { items: Row[]; isTruncated: boolean } | null = null;
  let error = "";
  try {
    result = await apiGet(`/audit/activity?${query}`, { cache: "no-store" });
  } catch (e) {
    error = e instanceof Error ? e.message : "Rapor alınamadı.";
  }
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Kullanıcı ve İşlem Raporları"
        description="Denetim günlüğündeki gerçek işlemler veritabanında gruplanır. Aktör kaydedilmeyen geçmiş olaylar ayrı gösterilir."
      />
      <Panel title="Rapor aralığı" padded>
        <form className="flex flex-wrap items-end gap-3">
          <label>
            Başlangıç (dahil, UTC)
            <input
              type="date"
              name="from"
              defaultValue={from}
              required
              className="block rounded border p-2"
            />
          </label>
          <label>
            Bitiş (hariç, UTC)
            <input
              type="date"
              name="to"
              defaultValue={to}
              required
              className="block rounded border p-2"
            />
          </label>
          <label>
            Kullanıcı kimliği
            <input
              name="actor"
              defaultValue={params.actor}
              className="block rounded border p-2"
            />
          </label>
          <button className="rounded bg-primary px-4 py-2 text-primary-foreground">
            Raporla
          </button>
        </form>
      </Panel>
      {error && <p role="alert">{error}</p>}
      {result && (
        <Panel
          title="İşlem özeti"
          actions={
            <ExportCsvButton
              name="kullanici-islemleri"
              headers={["Kullanıcı", "İşlem", "Sayı", "İlk", "Son"]}
              rows={result.items.map((r) => [
                r.actor,
                auditEventLabel(r.eventName),
                r.count,
                r.firstAt,
                r.lastAt,
              ])}
            />
          }
          padded
        >
          {result.isTruncated && (
            <p>
              1000 grup sınırına ulaşıldı; kullanıcı veya tarih aralığını
              daraltın.
            </p>
          )}
          {!result.items.length ? (
            <p>Bu aralıkta kayıt yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th>Kullanıcı</th>
                    <th>İşlem</th>
                    <th>Sayı</th>
                    <th>Son işlem</th>
                    <th>İz</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-3">
                        {r.actor ?? "Aktör kaydedilmemiş"}
                      </td>
                      <td>{auditEventLabel(r.eventName)}</td>
                      <td>{r.count}</td>
                      <td>
                        {new Date(r.lastAt).toLocaleString("tr-TR", {
                          timeZone: "Europe/Istanbul",
                        })}
                      </td>
                      <td>
                        <Link
                          className="text-primary underline"
                          href={`/denetim?${new URLSearchParams({ from, to, eventName: r.eventName, ...(r.actor ? { actor: r.actor } : {}) })}`}
                        >
                          Kayıtları incele
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
      <Link href="/operations" className="text-primary underline">
        Servis ve kalite ölçümlerine git
      </Link>
    </div>
  );
}
