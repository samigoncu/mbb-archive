import Link from "next/link";
import { Activity, CheckCircle2, Scan, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import {
  getDashboardData,
  measurement,
} from "@/features/dashboard/api/get-dashboard";
import { getDocuments } from "@/features/documents/api/get-documents";
import { UploadPanel } from "@/features/scanning/components/upload-panel";
import { Notice, PageHeader } from "@/components/ui/page";

export const metadata = { title: "Tarama ve İndeksleme · MBB Kurumsal Arşiv" };

const dateTime = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function TaramaPage() {
  const [{ overview }, recent] = await Promise.all([
    getDashboardData(),
    getDocuments(1, 10),
  ]);

  const securityPending = measurement(overview, "documents", "security_pending");
  const rejected = measurement(overview, "documents", "ingestion_rejected");
  const jobsActive = measurement(overview, "processing", "jobs_active");
  const indexPending = measurement(overview, "search", "index_pending");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tarama ve İndeksleme"
        description="Belge yükleme ve işleme boru hattının durumu."
      />

      <section aria-label="Boru hattı durumu" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Güvenlik Taramasında"
          value={securityPending}
          hint="ClamAV kuyruğunda"
          icon={ShieldCheck}
          tone={securityPending && securityPending > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Reddedilen"
          value={rejected}
          hint="Tarama geçemedi"
          icon={ShieldCheck}
          tone={rejected && rejected > 0 ? "danger" : "neutral"}
        />
        <StatTile
          label="İşlemde"
          value={jobsActive}
          hint="OCR / PDF inceleme"
          icon={Scan}
        />
        <StatTile
          label="İndeksleme Kuyruğu"
          value={indexPending}
          hint="Aramaya aktarılacak"
          icon={Activity}
          tone={indexPending && indexPending > 0 ? "warning" : "neutral"}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <UploadPanel />

        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-flat">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
            Son Yüklenenler
          </h2>
          {recent.items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Henüz belge yüklenmemiş.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Başlık</TableHead>
                    <TableHead className="w-40">Arşive Alındı</TableHead>
                    <TableHead className="w-40">Oluşturma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.items.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/documents/${document.id}`}
                          className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {document.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {document.versionCount > 0 ? (
                          <Badge variant="success">
                            <CheckCircle2 className="size-3" aria-hidden />
                            Depolandı
                          </Badge>
                        ) : (
                          <Badge variant="info">Boru hattında</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {dateTime.format(new Date(document.createdAt))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Notice icon={Scan}>
        <p>
          <strong className="font-medium text-foreground">
            Tarayıcı entegrasyonu ve sayfa işlemleri henüz yok.
          </strong>{" "}
          TWAIN/ADF ile doğrudan tarama, barkod ayracına göre otomatik evrak bölme,
          sayfa döndürme/silme ve tarama şablonları ayrı bir <span className="font-mono text-xs">Scanning</span>{" "}
          bounded context&apos;i gerektiriyor; o modül henüz yazılmadı. Bu ekran mevcut
          yükleme ve işleme boru hattını yönetir.
        </p>
      </Notice>
    </div>
  );
}
