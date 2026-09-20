"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  FolderTree,
  MapPin,
  ShieldCheck,
  CheckSquare,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Panel, EmptyState } from "@/components/ui/page";
import { documentStatusLabels } from "@/features/documents/model/document";
import { LinkedDocumentTitle } from "@/features/documents/components/linked-document-title";
import { ExplorerPagination } from "@/features/documents/components/explorer-pagination";
import type { LinkedDocument } from "@/features/documents/api/get-linked-documents";
import type { ArchiveUnit } from "@/features/dossiers/model/dossier";

export type FolderMeta = {
  id: string;
  barcode: string;
  title: string;
  filePlanCode: string;
  documentIds: string[];
  dispositions?: { documentId: string; processId: string; executedAt: string; actor: string; protocolReference: string; evidenceDocumentId: string }[];
  ownerUnitId: string | null;
  digitalDossierId: string | null;
};

// Standard municipal business workspace document checklist categories
const CHECKLIST_CATEGORIES = [
  { id: "decision", name: "Karar / Olur / Encümen Kararı", keywords: ["karar", "olur", "meclis", "encümen", "onay"] },
  { id: "contract", name: "Sözleşme / Protokol / Şartname", keywords: ["sözleşme", "protokol", "şartname", "taahhüt", "anlaşma"] },
  { id: "technical", name: "Keşif Özeti / Teknik Rapor / Proje", keywords: ["keşif", "rapor", "proje", "teknik", "plan", "çizim"] },
  { id: "finance", name: "Hakediş / Fatura / Ödeme Emri", keywords: ["hakediş", "fatura", "ödeme", "dekont", "mali"] },
  { id: "correspondence", name: "Resmi Yazışma / Kurum Görüşü", keywords: ["yazışma", "müzekkere", "görüş", "yazı", "talep", "dilekçe"] },
  { id: "minutes", name: "Tutanak / Teslim-Tesellüm / Kabul", keywords: ["tutanak", "teslim", "kabul", "tesellüm", "yer teslimi"] },
  { id: "cadastre", name: "Harita / Parsel / Kadastro Evrakı", keywords: ["harita", "parsel", "kadastro", "tapu", "aplikasyon"] },
];

export function DossierWorkspaceTabs({
  folder,
  owner,
  documents,
  page,
  totalPages,
  selected,
  detailsPanel,
  navigation,
}: {
  folder: FolderMeta;
  owner?: ArchiveUnit;
  documents: LinkedDocument[];
  page: number;
  totalPages: number;
  selected?: string;
  detailsPanel?: React.ReactNode;
  navigation: { basePath: string; folderPage: number; folderSearch: string };
}) {
  function href(nextPage: number, documentId?: string) {
    const params = new URLSearchParams({ page: String(nextPage), folderPage: String(navigation.folderPage) });
    if (navigation.folderSearch) params.set("folderSearch", navigation.folderSearch);
    if (documentId) params.set("selected", documentId);
    return `${navigation.basePath}?${params}`;
  }
  const [activeTab, setActiveTab] = useState<"documents" | "cover" | "timeline" | "checklist" | "gis">("documents");

  // Checklist evaluation based on document titles
  const checklistResults = CHECKLIST_CATEGORIES.map((cat) => {
    const matchingDocs = documents.filter((d) => {
      if (!d.details?.title) return false;
      const lower = d.details.title.toLowerCase();
      return cat.keywords.some((k) => lower.includes(k));
    });
    return {
      ...cat,
      present: matchingDocs.length > 0,
      count: matchingDocs.length,
      matchingDocs,
    };
  });

  const presentCount = checklistResults.filter((r) => r.present).length;
  const completionPercentage = Math.round((presentCount / CHECKLIST_CATEGORIES.length) * 100);

  // Chronological timeline sorting
  const timelineDocs = [...documents]
    .filter((d) => d.details)
    .sort((a, b) => new Date(a.details!.createdAt).getTime() - new Date(b.details!.createdAt).getTime());

  return (
    <div className="flex flex-col gap-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2 text-sm">
        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
            activeTab === "documents"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FileText className="size-4" />
          <span>Evraklar</span>
          <Badge variant="secondary" className="ml-1 text-[10px]">
            {folder.documentIds.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cover")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
            activeTab === "cover"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <FolderTree className="size-4" />
          <span>Dosya Kapağı & Künye</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
            activeTab === "timeline"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Clock className="size-4" />
          <span>Olay Örgüsü (Zaman Çizelgesi)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("checklist")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
            activeTab === "checklist"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <CheckSquare className="size-4" />
          <span>Kontrol Listesi</span>
          <Badge variant={completionPercentage >= 70 ? "default" : "outline"} className="ml-1 text-[10px]">
            %{completionPercentage}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("gis")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
            activeTab === "gis"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <MapPin className="size-4" />
          <span>Mekânsal & Harita</span>
        </button>
      </div>

      {/* Tab 1: Documents */}
      {activeTab === "documents" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className={selected ? "lg:col-span-8" : "lg:col-span-12"}>
            <Panel title={`${folder.documentIds.length} bağlı evrak`}>
              {!documents.length ? (
                <EmptyState icon={FileText} title="Dosyaya henüz belge bağlanmadı" />
              ) : (
                <ul className="divide-y divide-border">
                  {documents.map((document) => (
                    <li key={document.id} className={document.id === selected ? "bg-accent p-4" : "p-4"}>
                      <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <LinkedDocumentTitle document={document} />
                          {folder.dispositions?.filter(item => item.documentId === document.id).map(item => <div key={item.processId} className="mt-2 rounded-md border border-border bg-muted p-2 text-xs"><p>Fiziksel imha kaydı: {new Date(item.executedAt).toLocaleDateString("tr-TR")} · {item.protocolReference}</p><p>Dijital asıl ve sürümler korunuyor.</p><Link className="text-primary underline" href={`/devir-imha/islemler/${item.processId}`}>Kanıt ve işlem geçmişini aç</Link></div>)}
                          {document.details ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {document.details.createdAt.slice(0, 10)} · {document.details.versionCount} sürüm
                            </p>
                          ) : null}
                        </div>
                        {document.details ? (
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline">
                              {documentStatusLabels[document.details.status] ?? document.details.status}
                            </Badge>
                            <Link
                              href={href(page, document.id === selected ? undefined : document.id)}
                              aria-label={`${document.details.title} ayrıntıları`}
                              className="text-xs text-primary hover:underline"
                            >
                              {document.id === selected ? "Ayrıntıyı kapat" : "Ayrıntılar"}
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <ExplorerPagination page={page} totalPages={totalPages} href={(next) => href(next)} label="Klasör belge sayfaları" />
          </div>
          {selected && detailsPanel ? (
            <div className="lg:col-span-4">
              {detailsPanel}
            </div>
          ) : null}
        </div>
      )}

      {/* Tab 2: Cover Sheet & Overview */}
      {activeTab === "cover" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Dosya Künyesi & İdari Kimlik" padded>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-muted-foreground uppercase">Dosya Başlığı</dt>
                <dd className="mt-1 font-medium">{folder.title}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-foreground uppercase">Barkod / Klasör No</dt>
                <dd className="mt-1 font-mono font-medium">{folder.barcode}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-foreground uppercase">Dosya Plan Kodu (SDP)</dt>
                <dd className="mt-1 font-mono font-medium">{folder.filePlanCode}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-foreground uppercase">Sorumlu Birim</dt>
                <dd className="mt-1 font-medium">{owner?.name ?? "Birim ataması bekliyor"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-foreground uppercase">Dijital Dosya Durumu</dt>
                <dd className="mt-1">
                  {folder.digitalDossierId ? (
                    <Badge variant="outline" className="text-xs">Bağlı (ID: {folder.digitalDossierId.slice(0, 8)}…)</Badge>
                  ) : (
                    <span className="text-muted-foreground">Yalnız fiziksel klasör</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted-foreground uppercase">Bütünlük & Arşiv Koruması</dt>
                <dd className="mt-1 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="size-4" />
                  <span>WORM & SHA-256 Korumalı</span>
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Dosya İstatistikleri ve Özet" padded>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{folder.documentIds.length}</p>
                <p className="text-xs text-muted-foreground">Bağlı Evrak Adedi</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{completionPercentage}%</p>
                <p className="text-xs text-muted-foreground">Evrak Tamamlanma Oranı</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{checklistResults.filter(c => c.present).length} / {CHECKLIST_CATEGORIES.length}</p>
                <p className="text-xs text-muted-foreground">Temel Belge Türü</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 text-center">
                <p className="text-2xl font-bold text-foreground">Aktif</p>
                <p className="text-xs text-muted-foreground">İdari Durum</p>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* Tab 3: Timeline */}
      {activeTab === "timeline" && (
        <Panel title="Dosya Olay Örgüsü (Kronolojik Tarihçe)" padded>
          {!timelineDocs.length ? (
            <EmptyState icon={Clock} title="Dosyada henüz tarihsel evrak kaydı yok" />
          ) : (
            <div className="relative border-l-2 border-border ml-4 space-y-6 py-2">
              {timelineDocs.map((doc) => (
                <div key={doc.id} className="relative pl-6">
                  <div className="absolute -left-[9px] top-1 size-4 rounded-full bg-primary ring-4 ring-background" />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium text-muted-foreground">
                        {new Date(doc.details!.createdAt).toLocaleDateString("tr-TR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {documentStatusLabels[doc.details!.status] ?? doc.details!.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">· v{doc.details!.versionCount} sürüm</span>
                    </div>
                    <Link
                      href={`/documents/${encodeURIComponent(doc.id)}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {doc.details!.title}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* Tab 4: Document Checklist */}
      {activeTab === "checklist" && (
        <Panel title="İş / Proje Dosyası Eksik Evrak Kontrol Listesi" padded>
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <div>
              <p className="text-sm font-semibold">Dosya Bütünlük Oranı: %{completionPercentage}</p>
              <p className="text-xs text-muted-foreground">
                Standart kurumsal süreçler için beklenen 7 temel evrak kategorisinden {presentCount} tanesi mevcut.
              </p>
            </div>
            <div className="h-3 w-32 overflow-hidden rounded-full bg-border">
              <div
                className={`h-full ${completionPercentage >= 70 ? "bg-emerald-600" : "bg-amber-600"}`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {checklistResults.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col gap-2 rounded-lg border p-3.5 transition-colors ${
                  item.present
                    ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
                    : "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.present ? (
                      <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="size-5 text-amber-600 dark:text-amber-400" />
                    )}
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <Badge variant={item.present ? "default" : "outline"} className="text-xs">
                    {item.present ? `${item.count} belge eşleşti` : "Eksik Evrak"}
                  </Badge>
                </div>
                {item.present && (
                  <ul className="ml-7 space-y-1 text-xs text-muted-foreground">
                    {item.matchingDocs.slice(0, 3).map((d) => (
                      <li key={d.id}>
                        <Link href={`/documents/${encodeURIComponent(d.id)}`} className="text-primary hover:underline">
                          • {d.details?.title}
                        </Link>
                      </li>
                    ))}
                    {item.matchingDocs.length > 3 && (
                      <li>ve {item.matchingDocs.length - 3} diğer belge…</li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Tab 5: GIS & Spatial */}
      {activeTab === "gis" && (
        <Panel title="Mekânsal & Harita Entegrasyonu" padded>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <MapPin className="size-12 text-primary/70" />
            <div className="max-w-md">
              <h3 className="text-base font-semibold">Dosya Harita ve CBS Bağlantısı</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Bu dosyaya bağlı evrakların tapu, parsel, ada veya koordinat bilgileri Coğrafi Bilgi Sistemi (GIS) üzerinden görselleştirilebilir.
              </p>
            </div>
            <Link
              href="/harita"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <MapPin className="size-4" />
              <span>Harita Modülünde Aç</span>
              <ExternalLink className="size-3.5 opacity-80" />
            </Link>
          </div>
        </Panel>
      )}
    </div>
  );
}
