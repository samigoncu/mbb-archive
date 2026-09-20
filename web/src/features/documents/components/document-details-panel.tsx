import { getCurrentUser } from "@/features/access/api/get-current-user";
import { getDocumentVersions } from "../api/get-document-versions";
import { DocumentActions } from "./document-actions";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  History,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { auditEventLabel, auditEventTimestamp } from "@/features/audit/model/audit";
import { getDocumentById } from "@/features/documents/api/get-document-by-id";
import {
  documentContentUrl,
  getDocumentAuditTrail,
  getDocumentFolders,
} from "@/features/documents/api/get-document-context";
import { getDocumentIntegrity } from "@/features/documents/api/get-document-integrity";
import { documentStatusLabels } from "@/features/documents/model/document";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function DocumentDetailsPanel({ documentId }: { documentId: string }) {
  const [details, integrity, folders, audit, versions, user] = await Promise.all([
    getDocumentById(documentId).catch(() => null),
    getDocumentIntegrity(documentId),
    getDocumentFolders(documentId).catch(() => []),
    getDocumentAuditTrail(documentId, 6).catch(() => []),
    getDocumentVersions(documentId), getCurrentUser(),
  ]);

  if (!details) {
    return (
      <aside className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Belge ayrıntısı alınamadı.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold leading-snug">{details.title}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {documentStatusLabels[details.status] ?? details.status}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {details.versionCount} sürüm
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/documents/${details.id}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          Belgeyi Aç
        </Link>
        {integrity ? (
          <a
            href={documentContentUrl(details.id, true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Download className="size-3.5" aria-hidden />
            İndir
          </a>
        ) : null}
      </div>

      <DocumentActions folders={folders} details={details} versions={versions} selectedVersion={details.currentVersionNumber ?? integrity?.versionNumber ?? details.versionCount} canCancelVersion={Boolean(user?.isAuthenticated && (user.isBootstrapAdministrator || user.permissions.includes("documents.versions.cancel")))} canCancelDocument={Boolean(user?.isAuthenticated && (user.isBootstrapAdministrator || user.permissions.includes("documents.cancel")))} />

      <Section title="Künye" icon={FileCheck2}>
        <Row label="Oluşturma" value={details.createdAt.slice(0, 10)} />
        <Row
          label="Arşivlenme"
          value={details.archivedAt ? details.archivedAt.slice(0, 10) : "—"}
        />
        <Row label="Kimlik" value={details.id.slice(0, 8)} mono />
      </Section>

      <Section title="Bütünlük" icon={Fingerprint}>
        {integrity ? (
          <>
            <Row label="Sürüm" value={`v${integrity.versionNumber}`} />
            <Row label="Tür" value={integrity.mimeType} />
            <Row label="Boyut" value={formatBytes(integrity.sizeBytes)} />
            <div className="pt-1">
              <p className="text-xs text-muted-foreground">SHA-256</p>
              <p className="mt-0.5 break-all font-mono text-[10px] leading-relaxed text-foreground">
                {integrity.sha256Hash}
              </p>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Henüz depolanmış sürüm yok; dosya güvenlik taraması veya işleme
            kuyruğunda olabilir.
          </p>
        )}
      </Section>

      <Section title="Fiziksel Konum" icon={MapPin}>
        {folders.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Fiziksel klasöre bağlanmamış.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {folders.map((folder) => (
              <li key={folder.id} className="text-xs">
                <span className="font-mono font-semibold text-primary">
                  {folder.barcode}
                </span>
                <span className="ml-1.5 text-muted-foreground">
                  {folder.locationName || folder.locationCode}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Denetim İzi" icon={History}>
        {audit.length === 0 ? (
          <p className="text-xs text-muted-foreground">Kayıt bulunamadı.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {audit.map((entry) => (
              <li
                key={entry.messageId}
                className="flex items-baseline justify-between gap-2 text-xs"
              >
                <span className="min-w-0 truncate">
                  {auditEventLabel(entry.eventName)}
                </span>
                <time
                  dateTime={auditEventTimestamp(entry)}
                  className="shrink-0 text-[10px] text-muted-foreground"
                >
                  {auditEventTimestamp(entry).slice(0, 10)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </aside>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1.5 border-t border-border pt-3">
      <h3 className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-foreground" : "text-foreground"}>
        {value}
      </span>
    </div>
  );
}
