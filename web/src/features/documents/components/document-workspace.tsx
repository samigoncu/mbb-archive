"use client";

import { officeMimeTypes } from "../model/office-formats";
import { isRenditionSupported } from "../model/office-formats";
import { OfficePreview } from "./office-preview";
import { DocumentFullscreen } from "./document-fullscreen";
import { DocumentVersionUpload } from "./document-version-upload";
import { DocumentActions } from "./document-actions";
import { DocumentRelations } from "./document-relations";
import { DocumentVersionText } from "./document-version-text";
import { DocumentProtection } from "./document-protection";
import { DocumentWorkflowHistory } from "@/features/workflow/components/document-workflow-history";

import { useState } from "react";
import Link from "next/link";
import {
  Download,
  FileText,
  Fingerprint,
  History,
  ImageOff,
  Layers,
  Lock,
  MapPin,
  RotateCw,
  Type,
  Workflow,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Notice } from "@/components/ui/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import {
  auditEventLabel,
  auditEventTimestamp,
} from "@/features/audit/model/audit";
import type { AuditEntry } from "@/features/documents/api/get-document-context";
import type { DocumentDetails } from "@/features/documents/api/get-document-by-id";
import type { DocumentIntegrity } from "@/features/documents/api/get-document-integrity";
import type { DocumentText } from "@/features/documents/api/get-document-text";
import type { DocumentVersionSummary } from "@/features/documents/api/get-document-versions";
import type { CollectionListItem } from "@/features/collections/model/collection";
import { DocumentCollections } from "@/features/collections/components/document-collections";
import type {
  GeoEntitySummary,
  GeoRelationDetails,
} from "@/features/geo/model/geo";
import { DocumentGeoRelations } from "@/features/geo/components/document-geo-relations";
import { documentStatusLabels } from "@/features/documents/model/document";
import type { FolderListItem } from "@/features/physical-archive/model/folder";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const imageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export function DocumentWorkspace({
  details,
  integrity,
  versions,
  text,
  folders,
  collections,
  geo,
  audit,
  contentUrl,
  downloadUrl,
  canUpload,
  selectedVersion,
  canCancel = false,
  canCancelDocument = false,
}: {
  details: DocumentDetails;
  integrity: DocumentIntegrity | null;
  versions: DocumentVersionSummary[];
  text: DocumentText | null;
  folders: FolderListItem[];
  collections: {
    memberOf: CollectionListItem[];
    available: CollectionListItem[];
  };
  geo: {
    relations: GeoRelationDetails[];
    entities: GeoEntitySummary[];
  };
  audit: AuditEntry[];
  contentUrl: string;
  downloadUrl: string;
  canUpload: boolean;
  selectedVersion: number;
  canCancel?: boolean;
  canCancelDocument?: boolean;
}) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const latestVersion = details.currentVersionNumber ?? integrity?.versionNumber ?? details.versionCount;
  const displayed = versions.find(version => version.versionNumber === selectedVersion)
    ?? (selectedVersion === latestVersion ? integrity : null);
  const historical = selectedVersion !== latestVersion;
  const versionUrl = (version: number) => `/documents/${encodeURIComponent(details.id)}?version=${version}`;
  const mimeType = displayed?.mimeType ?? null;
  const isPdf = mimeType === "application/pdf";
  const isOffice = isRenditionSupported(mimeType);
  const isImage = mimeType !== null && imageTypes.has(mimeType);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-snug text-foreground">
            {details.title}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="text-[10px]">
              {documentStatusLabels[details.status] ?? details.status}
            </Badge>
            {mimeType ? (
              <Badge variant="outline" className="text-[10px]">
                {mimeType}
              </Badge>
            ) : null}
            <Badge variant="outline" className="text-[10px]">
              Görüntülenen: v{selectedVersion}{historical ? " · eski sürüm" : " · güncel"}
            </Badge>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {(isPdf || isImage || isOffice) && <DocumentFullscreen key={`${details.id}:${selectedVersion}`} documentId={details.id} title={details.title} version={selectedVersion} contentUrl={contentUrl} kind={isOffice ? "office" : isPdf ? "pdf" : "image"} />}
          <Link
            href="/documents"
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
          >
            Listeye dön
          </Link>
          {displayed ? (
            <a
              href={downloadUrl}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Download className="size-4" aria-hidden />
              v{selectedVersion} orijinalini indir
            </a>
          ) : null}
        </div>
      </header>

      <Dialog>
        {details.status !== "Cancelled" ? <DocumentVersionUpload key={details.id} documentId={details.id} documentTitle={details.title} currentVersion={latestVersion} archived={details.status === "Archived"} canUpload={canUpload}
          actions={<DialogTrigger render={<Button type="button" variant="outline" />}>Belge işlemleri</DialogTrigger>} />
          : <div className="flex justify-end"><DialogTrigger render={<Button type="button" variant="outline" />}>Belge işlemleri</DialogTrigger></div>}
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Belge işlemleri</DialogTitle><DialogDescription>Dosyalama, belge ve sürüm iptali, geri alma ve fiziksel konum işlemleri.</DialogDescription></DialogHeader>
          <DocumentActions folders={folders} details={details} versions={versions} selectedVersion={selectedVersion} canCancelVersion={canCancel} canCancelDocument={canCancelDocument} />
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* SOL: SÜRÜM / DOSYA GEZİNTİSİ */}
        <aside className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 lg:col-span-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Sürümler ({versions.length})
          </h2>

          {versions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Henüz depolanmış sürüm yok.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {versions.map((version) => (
                <li
                  key={version.versionNumber}
                >
                  <Link
                    href={versionUrl(version.versionNumber)}
                    scroll={false}
                    aria-current={version.versionNumber === selectedVersion ? "true" : undefined}
                    aria-label={`v${version.versionNumber} sürümünü görüntüle`}
                    className={`block rounded-lg border p-2 text-xs hover:border-primary focus-visible:outline-2 focus-visible:outline-primary ${
                    version.versionNumber === selectedVersion
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary">
                      v{version.versionNumber}
                    </span>
                    {version.cancelledAt && <span className="text-amber-700 dark:text-amber-400">İptal edildi</span>}
                    {version.versionNumber === latestVersion ? (
                      <span className="text-[9px] font-semibold uppercase text-muted-foreground">
                        güncel
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {version.createdAt.slice(0, 10)} ·{" "}
                    {formatBytes(version.sizeBytes)}
                  </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* ORTA: GÖRÜNTÜLEYİCİ */}
        <div className="flex flex-col gap-2 lg:col-span-6">
          {historical && <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3 text-sm">
            <span>v{selectedVersion} sürümünü görüntülüyorsunuz. Güncel sürüm v{latestVersion}.</span>
            <Link href={versionUrl(latestVersion)} scroll={false} className="font-semibold text-primary underline">Güncel sürüme dön</Link>
          </div>}
          {isImage ? (
            <div className="flex items-center justify-end gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
              <button
                onClick={() => setZoom((z) => Math.max(50, z - 10))}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Küçült"
              >
                <ZoomOut className="size-4" />
              </button>
              <span className="font-mono text-xs text-muted-foreground">
                %{zoom}
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(200, z + 10))}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Büyüt"
              >
                <ZoomIn className="size-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Döndür"
              >
                <RotateCw className="size-4" />
              </button>
            </div>
          ) : null}

          <div className="flex min-h-[640px] items-start justify-center overflow-auto rounded-lg border border-border bg-slate-100 p-3 dark:bg-slate-900">
            {isPdf ? (
              <iframe
                key={contentUrl}
                src={contentUrl}
                title={`${details.title} — v${selectedVersion}`}
                className="h-[640px] w-full rounded border border-slate-300 bg-white"
              />
            ) : isOffice ? (
              <OfficePreview key={selectedVersion} documentId={details.id} title={`${details.title} — v${selectedVersion}`} versionNumber={selectedVersion} />
            ) : isImage ? (
              <img
                src={contentUrl}
                alt={`${details.title} — v${selectedVersion}`}
                className="max-h-[620px] rounded bg-white object-contain shadow"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                }}
              />
            ) : (
              <div className="flex w-full items-center justify-center">
                <EmptyState
                  icon={displayed ? ImageOff : FileText}
                  title={
                    displayed
                      ? "Bu tür için önizleme üretilmiyor"
                      : "Dosya henüz arşive alınmadı"
                  }
                  description={
                    displayed
                      ? "Bu dosya türü tarayıcıda görüntülenemiyor. Orijinal dosyayı indirerek açabilirsiniz."
                      : "Belge kaydı var ancak depolanmış sürüm yok; dosya güvenlik taraması veya işleme kuyruğunda olabilir."
                  }
                />
              </div>
            )}
          </div>

          <Notice icon={Lock}>
            Orijinal dosya değiştirilemez. Düzeltme gerekiyorsa yeni sürüm
            eklenir; mevcut sürümün içeriği ve SHA-256 değeri korunur.
          </Notice>
        </div>

        {/* SAĞ: BİLGİ SEKMELERİ */}
        <div className="lg:col-span-4">
          <Tabs defaultValue="kunye">
            <TabsList variant="line" className="group-data-horizontal/tabs:h-auto flex-wrap justify-start gap-y-3">
              <TabsTrigger value="kunye">Künye</TabsTrigger>
              <TabsTrigger value="ocr">OCR</TabsTrigger>
              <TabsTrigger value="iliski">İlişkiler</TabsTrigger>
              <TabsTrigger value="harita">Harita</TabsTrigger>
              <TabsTrigger value="surum">Sürümler</TabsTrigger>
              <TabsTrigger value="akis">İş Akışı</TabsTrigger>
              <TabsTrigger value="denetim">Denetim</TabsTrigger>
            </TabsList>

            <div className="mt-3 rounded-lg border border-border bg-card p-4">
              <TabsContent value="kunye" className="flex flex-col gap-3">
                <Row
                  label="Durum"
                  value={documentStatusLabels[details.status] ?? details.status}
                />
                <Row label="Oluşturma" value={details.createdAt.slice(0, 10)} />
                <Row
                  label="Arşivlenme"
                  value={
                    details.archivedAt ? details.archivedAt.slice(0, 10) : "—"
                  }
                />
                <Row label="Kimlik" value={details.id} mono />

                <div className="border-t border-border pt-3">
                  <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Fingerprint className="size-3.5" aria-hidden />
                    Bütünlük
                  </h3>
                  {displayed ? (
                    <div className="flex flex-col gap-2">
                      <Row label="Sürüm" value={`v${selectedVersion}`} />
                      <Row label="Tür" value={displayed.mimeType} />
                      <Row
                        label="Boyut"
                        value={formatBytes(displayed.sizeBytes)}
                      />
                      <div>
                        <p className="text-xs text-muted-foreground">SHA-256</p>
                        <p className="mt-0.5 break-all font-mono text-[10px] leading-relaxed">
                          {displayed.sha256Hash}
                        </p>
                      </div>
                      <DocumentProtection key={details.id} documentId={details.id} version={selectedVersion} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Depolanmış sürüm yok.
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="ocr">
                {historical ? (
                  <DocumentVersionText key={`${details.id}:${selectedVersion}`} documentId={details.id} version={selectedVersion} />
                ) : text?.hasText ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">
                      {text.characterCount.toLocaleString("tr")} karakter
                      {text.isTruncated ? " (kırpıldı)" : ""}
                    </p>
                    <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                      {text.text}
                    </pre>
                  </div>
                ) : (
                  <EmptyState
                    icon={Type}
                    title="Metin katmanı yok"
                    description="Belge henüz OCR'dan geçmemiş ya da metin çıkarımı desteklenmeyen bir türde."
                  />
                )}
              </TabsContent>

              <TabsContent value="iliski" className="flex flex-col gap-3">
                <div>
                  <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden />
                    Fiziksel Konum
                  </h3>
                  {folders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Fiziksel klasöre bağlanmamış.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {folders.map((folder) => (
                        <li key={folder.id} className="text-xs">
                          <Link
                            href="/dosya-islemleri"
                            className="font-mono font-semibold text-primary hover:underline"
                          >
                            {folder.barcode}
                          </Link>
                          <span className="ml-1.5 text-muted-foreground">
                            {folder.title} ·{" "}
                            {folder.locationName || folder.locationCode}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <DocumentCollections
                  documentId={details.id}
                  memberOf={collections.memberOf}
                  available={collections.available}
                />

                <DocumentRelations documentId={details.id} canManage={canUpload} />
              </TabsContent>

              <TabsContent value="harita">
                <DocumentGeoRelations
                  documentId={details.id}
                  relations={geo.relations}
                  entities={geo.entities}
                />
              </TabsContent>

              <TabsContent value="surum">
                {versions.length === 0 ? (
                  <EmptyState icon={Layers} title="Depolanmış sürüm yok" />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {versions.map((version) => (
                      <li
                        key={version.versionNumber}
                        className="rounded-lg border border-border p-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-primary">
                            v{version.versionNumber}
                          </span>
                          <span className="text-muted-foreground">
                            {version.createdAt.slice(0, 10)}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {version.mimeType} · {formatBytes(version.sizeBytes)}
                        </p>
                        {version.cancelledAt && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">İptal edildi · {version.cancelledBy} · {version.cancelledAt.slice(0, 10)}<br />Gerekçe: {version.cancellationReason}</p>}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Yükleyen:{" "}
                          {version.createdBy === "unknown" ? (
                            <span className="italic">kayıt öncesi</span>
                          ) : (
                            version.createdBy
                          )}
                        </p>
                        {version.reason ? (
                          <p className="mt-1 text-[11px] text-foreground">
                            Gerekçe: {version.reason}
                          </p>
                        ) : null}
                        <p className="mt-1 break-all font-mono text-[9px] text-muted-foreground">
                          {version.sha256Hash}
                        </p>
                        <Link href={versionUrl(version.versionNumber)} scroll={false} aria-current={version.versionNumber === selectedVersion ? "true" : undefined} className="mt-2 inline-block text-xs font-semibold text-primary underline">
                          v{version.versionNumber} sürümünü görüntüle
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="akis">
                <DocumentWorkflowHistory documentId={details.id} />
              </TabsContent>

              <TabsContent value="denetim">
                {audit.length === 0 ? (
                  <EmptyState icon={History} title="Denetim kaydı yok" />
                ) : (
                  <ol className="flex flex-col gap-2">
                    {audit.map((entry) => (
                      <li
                        key={entry.messageId}
                        className="flex items-baseline justify-between gap-2 border-b border-border pb-2 text-xs last:border-0"
                      >
                        <span className="min-w-0">
                          {auditEventLabel(entry.eventName)}
                          <span className="block text-xs text-muted-foreground">
                            {entry.actor ?? "Aktör kaydedilmemiş"} ·{" "}
                            {entry.outcome ?? "—"} · {entry.ipAddress ?? "—"}
                          </span>
                        </span>
                        <time
                          dateTime={auditEventTimestamp(entry)}
                          className="shrink-0 text-[10px] text-muted-foreground"
                        >
                          {auditEventTimestamp(entry)
                            .slice(0, 16)
                            .replace("T", " ")}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}
              </TabsContent>

            </div>
          </Tabs>
        </div>
      </div>
    </div>
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
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className={mono ? "break-all text-right font-mono" : "text-right"}>
        {value}
      </span>
    </div>
  );
}
