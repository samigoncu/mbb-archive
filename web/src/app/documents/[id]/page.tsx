import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api/api-client";
import { getDocumentById } from "@/features/documents/api/get-document-by-id";
import {
  documentContentUrl,
  getDocumentAuditTrail,
  getDocumentFolders,
} from "@/features/documents/api/get-document-context";
import { DocumentViewer } from "@/features/documents/components/document-viewer";
import {
  AuditTrailPanel,
  EvidencePanel,
  PhysicalLocationPanel,
} from "@/features/documents/components/document-panels";

export const metadata = { title: "Belge Görüntüleyici · MBB Kurumsal Arşiv" };

const statusLabels: Record<string, string> = {
  Draft: "Taslak",
  Active: "Aktif",
  Archived: "Arşivlendi",
};

const dateTime = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "short",
  timeStyle: "short",
});

type PageProps = { params: Promise<{ id: string }> };

export default async function DocumentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const document = await loadDocument(id);

  const [folders, audit] = await Promise.all([
    getDocumentFolders(id).catch(() => []),
    getDocumentAuditTrail(id).catch(() => []),
  ]);

  const hasContent = document.versionCount > 0;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/documents"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Belgeler
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {document.title}
          </h1>
          <p className="mt-1 font-mono text-2xs text-muted-foreground">{document.id}</p>
        </div>
        <Badge variant="secondary">
          {statusLabels[document.status] ?? document.status}
        </Badge>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <DocumentViewer
          contentUrl={documentContentUrl(id)}
          downloadUrl={documentContentUrl(id, true)}
          mimeType={hasContent ? "application/pdf" : null}
          hasContent={hasContent}
        />

        <Tabs defaultValue="metadata" className="min-w-0">
          <TabsList className="w-full">
            <TabsTrigger value="metadata">Üstveri</TabsTrigger>
            <TabsTrigger value="location">Konum</TabsTrigger>
            <TabsTrigger value="evidence">E-İmza</TabsTrigger>
            <TabsTrigger value="audit">Denetim</TabsTrigger>
          </TabsList>

          <TabsContent value="metadata" className="mt-3">
            <dl className="flex flex-col gap-px overflow-hidden rounded-lg border border-border bg-border">
              <Detail label="Durum">
                {statusLabels[document.status] ?? document.status}
              </Detail>
              <Detail label="Versiyon Sayısı">{document.versionCount}</Detail>
              <Detail label="Oluşturma">
                {dateTime.format(new Date(document.createdAt))}
              </Detail>
              <Detail label="Arşivlenme">
                {document.archivedAt
                  ? dateTime.format(new Date(document.archivedAt))
                  : "—"}
              </Detail>
            </dl>
          </TabsContent>

          <TabsContent value="location" className="mt-3">
            <PhysicalLocationPanel folders={folders} />
          </TabsContent>

          <TabsContent value="evidence" className="mt-3">
            <EvidencePanel />
          </TabsContent>

          <TabsContent value="audit" className="mt-3">
            <AuditTrailPanel entries={audit} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/** Olmayan belge 500 değil 404 üretir; diğer hatalar error boundary'ye düşer. */
async function loadDocument(id: string) {
  try {
    return await getDocumentById(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 bg-card px-3 py-2.5">
      <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm tabular-nums">{children}</dd>
    </div>
  );
}
