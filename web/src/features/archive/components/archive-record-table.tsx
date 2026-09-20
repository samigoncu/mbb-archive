"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Gavel, Search, X, CheckSquare, Square, CheckCircle2, ShieldCheck, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Panel } from "@/components/ui/page";
import { ExportCsvButton } from "@/components/export-csv-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeclareRecordDialog } from "@/features/archive/components/declare-record-dialog";
import { BulkDeclareDialog } from "@/features/archive/components/bulk-declare-dialog";
import {
  archiveStatusLabels,
  archiveStatusVariants,
  type ArchiveRecordListItem,
} from "@/features/archive/model/archive-record";
import type { FilePlanNode } from "@/features/classification/model/classification";
import type { RetentionRuleListItem } from "@/features/retention/model/retention";
import { cn } from "@/lib/utils";

export function ArchiveRecordTable({
  records,
  documentTitles = {},
  totalCount,
  filePlanItems,
  retentionRules,
}: {
  documentTitles?: Record<string, string>;
  records: ArchiveRecordListItem[];
  totalCount: number;
  filePlanItems: FilePlanNode[];
  retentionRules: RetentionRuleListItem[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase("tr");
    if (!term) return records;
    return records.filter((r) => {
      const title = (documentTitles[r.documentId] ?? "").toLocaleLowerCase("tr");
      const docId = r.documentId.toLocaleLowerCase("tr");
      const hash = r.sha256Hash.toLocaleLowerCase("tr");
      const classification = (r.classificationCode ?? "").toLocaleLowerCase("tr");
      return (
        title.includes(term) ||
        docId.includes(term) ||
        hash.includes(term) ||
        classification.includes(term)
      );
    });
  }, [records, documentTitles, searchTerm]);

  // Candidates on the current filtered view
  const candidateRecords = useMemo(
    () => filteredRecords.filter((r) => r.status === "Candidate"),
    [filteredRecords],
  );

  const isAllCandidatesSelected =
    candidateRecords.length > 0 &&
    candidateRecords.every((r) => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (isAllCandidatesSelected) {
      // Deselect all
      setSelectedIds(new Set());
    } else {
      // Select all candidate records
      setSelectedIds(new Set(candidateRecords.map((r) => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (records.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={Gavel}
          title="Bu süzgeçle arşiv kaydı yok"
          description="Orijinali saklanan her belge sürümü için otomatik olarak bir aday kayıt oluşur."
        />
      </Panel>
    );
  }

  return (
    <Panel
      title="Arşiv Kayıtları ve Tescil Kütüğü"
      description={`${totalCount} kayıt · ${candidateRecords.length} beyan bekleyen aday belge`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ExportCsvButton
            name="arsiv-kayitlari"
            headers={[
              "Belge Kimliği",
              "Belge Başlığı",
              "Durum",
              "Dosya Planı Kodu",
              "Saklama Kuralı",
              "SHA-256 Özeti",
              "Oluşturulma",
              "Beyan Tarihi",
            ]}
            rows={filteredRecords.map((r) => [
              r.documentId,
              documentTitles[r.documentId] ?? "",
              archiveStatusLabels[r.status] ?? r.status,
              r.classificationCode ?? "",
              r.retentionRuleCode ?? "",
              r.sha256Hash,
              r.createdAt,
              r.declaredAt ?? "",
            ])}
          />

          <div className="relative w-44 sm:w-60">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Belge adı, kod veya hash ara…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs rounded-lg"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Aramayı temizle"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {/* TOPLU BEYAN İŞLEM ÇUBUĞU (Seçim Varsa Görünür) */}
        {selectedIds.size > 0 && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 flex flex-wrap items-center justify-between gap-3 transition-all animate-in fade-in-50">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <CheckCircle2 className="size-4" />
              </span>
              <div className="text-xs">
                <span className="font-bold text-foreground">
                  {selectedIds.size} adet aday belge seçildi
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Tüm seçilen kayıtlara aynı dosya planı ve saklama kuralını tek seferde atayabilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Seçimi Temizle
              </Button>

              <BulkDeclareDialog
                recordIds={Array.from(selectedIds)}
                filePlanItems={filePlanItems}
                retentionRules={retentionRules}
                onCompleted={() => setSelectedIds(new Set())}
              />
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-border/80">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                {candidateRecords.length > 0 && (
                  <TableHead className="w-10 px-3">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center rounded hover:bg-muted p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title={isAllCandidatesSelected ? "Seçimi Kaldır" : "Tüm Adayları Seç"}
                      aria-label="Tüm aday kayıtları seç"
                    >
                      {isAllCandidatesSelected ? (
                        <CheckSquare className="size-4 text-primary" />
                      ) : (
                        <Square className="size-4" />
                      )}
                    </button>
                  </TableHead>
                )}
                <TableHead>Belge</TableHead>
                <TableHead className="w-32">Durum</TableHead>
                <TableHead className="w-44">Sınıflandırma (SDP)</TableHead>
                <TableHead className="w-40">Saklama Kuralı</TableHead>
                <TableHead className="w-32">Kayıt Tarihi</TableHead>
                <TableHead className="w-28 text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => {
                const isCandidate = record.status === "Candidate";
                const isSelected = selectedIds.has(record.id);

                return (
                  <TableRow
                    key={record.id}
                    className={cn(
                      "transition-colors",
                      isSelected ? "bg-primary/[0.04]" : "",
                    )}
                  >
                    {candidateRecords.length > 0 && (
                      <TableCell className="px-3">
                        {isCandidate ? (
                          <button
                            type="button"
                            onClick={() => toggleSelect(record.id)}
                            className="flex items-center justify-center rounded hover:bg-muted p-1 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={`Belgeyi seç: ${record.id}`}
                          >
                            {isSelected ? (
                              <CheckSquare className="size-4 text-primary" />
                            ) : (
                              <Square className="size-4" />
                            )}
                          </button>
                        ) : (
                          <span className="inline-block size-4" />
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Link
                        href={`/documents/${record.documentId}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {documentTitles[record.documentId] ?? "Belgeyi aç"}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono text-[11px]">{record.mimeType}</span>
                        <span>·</span>
                        <span>{formatBytes(record.sizeBytes)}</span>
                      </div>
                      <details className="mt-1.5 text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground inline-flex items-center gap-1">
                          <ShieldCheck className="size-3 text-emerald-600" />
                          <span>Kriptografik Özet (SHA-256)</span>
                        </summary>
                        <p className="mt-1 max-w-sm break-all font-mono text-[10px] bg-muted/40 p-1.5 rounded border border-border/60">
                          {record.sha256Hash}
                        </p>
                      </details>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={archiveStatusVariants[record.status] ?? "secondary"}
                        className="text-xs"
                      >
                        {archiveStatusLabels[record.status] ?? record.status}
                      </Badge>
                      {record.declaredAt && (
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {formatDate(record.declaredAt)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {record.classificationCode ? (
                        <span className="font-mono font-medium text-foreground">
                          {record.classificationCode}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">
                          Eşleşmedi
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {record.retentionRuleCode ? (
                        <span className="font-medium text-foreground">
                          {record.retentionRuleCode}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic text-[11px]">
                          Atanmadı
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(record.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isCandidate ? (
                        <DeclareRecordDialog
                          record={record}
                          filePlanItems={filePlanItems}
                          retentionRules={retentionRules}
                        />
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground font-normal border-border">
                          Değişmez Kilit
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </Panel>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("tr-TR", { dateStyle: "medium" });
}
