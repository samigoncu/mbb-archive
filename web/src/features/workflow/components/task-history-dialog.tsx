"use client";

import { useState, useEffect, useTransition } from "react";
import {
  History,
  CheckCircle2,
  Clock,
  User,
  FileText,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getDocumentWorkflowHistory,
  type DocumentWorkflowItem,
} from "../api/document-history";
import type { PagedResult } from "@/features/documents/model/document";

function formatDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("tr-TR", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export function TaskHistoryDialog({
  documentId,
  documentTitle,
  trigger,
}: {
  documentId: string;
  documentTitle?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PagedResult<DocumentWorkflowItem> | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let active = true;
    startTransition(async () => {
      const result = await getDocumentWorkflowHistory(documentId, page);
      if (active) {
        setData(result.data ?? null);
        setError(result.error ?? "");
      }
    });
    return () => {
      active = false;
    };
  }, [open, documentId, page, revision]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs rounded-lg hover:bg-muted"
            />
          )
        }
      >
        {!trigger && (
          <>
            <History className="size-3.5 text-muted-foreground" aria-hidden />
            <span>Süreç geçmişi</span>
          </>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card">
        {/* Header */}
        <DialogHeader className="border-b border-border/60 bg-gradient-to-b from-muted/30 to-transparent px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs shrink-0">
              <History className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  İş Akışı ve Süreç Geçmişi
                </DialogTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => setRevision((v) => v + 1)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="size-3 mr-1" aria-hidden />
                  Yenile
                </Button>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                {documentTitle ? `Belge: ${documentTitle}` : "Belgeye ait görev ve onay hareketleri"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
          {pending && (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-xs gap-2">
              <span className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <span>Süreç geçmişi yükleniyor…</span>
            </div>
          )}

          {error && !pending && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          {!pending && !error && data?.totalCount === 0 && (
            <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
              <History className="size-8 mx-auto mb-2 opacity-40" />
              Bu belge için henüz kayıtlı bir iş akışı veya görev adımı bulunmuyor.
            </div>
          )}

          {!pending && data && data.items.length > 0 && (
            <ol className="relative border-l border-border/80 ml-3.5 space-y-4">
              {data.items.map((item, idx) => {
                const isDone = item.status === "Completed";
                const isEscalated = item.status === "Escalated";

                return (
                  <li key={item.id || idx} className="ml-5">
                    {/* Timeline Node Point */}
                    <span
                      className={`absolute -left-2 mt-1.5 flex size-4 items-center justify-center rounded-full ring-4 ring-card ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isEscalated
                            ? "bg-amber-500 text-white"
                            : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="size-2.5" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-current" />
                      )}
                    </span>

                    {/* Step Card */}
                    <div className="rounded-xl border border-border/70 bg-muted/15 p-3.5 space-y-2 text-xs shadow-2xs hover:border-border transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground text-[13px]">
                            {item.nodeName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.definitionName}
                          </p>
                        </div>
                        <Badge
                          variant={
                            isDone
                              ? "success"
                              : isEscalated
                                ? "warning"
                                : "secondary"
                          }
                          className="text-[10px] px-2 py-0.5"
                        >
                          {isDone
                            ? "Tamamlandı"
                            : isEscalated
                              ? "Üst Kademeye İletildi"
                              : "Açık Görev"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/50 text-[11.5px]">
                        <div className="space-y-1">
                          <p className="text-muted-foreground flex items-center gap-1.5">
                            <User className="size-3 text-muted-foreground shrink-0" />
                            <span>Atanan:</span>
                            <span className="font-medium text-foreground">
                              {item.assigneeSubjectId ?? "Atama bekliyor"}
                            </span>
                          </p>
                          {item.assignedBy && (
                            <p className="text-muted-foreground text-[11px]">
                              Atayan: {item.assignedBy} ({formatDate(item.assignedAt)})
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="text-muted-foreground flex items-center gap-1.5">
                            <Clock className="size-3 text-muted-foreground shrink-0" />
                            <span>Oluşturulma:</span>
                            <span className="font-medium text-foreground">
                              {formatDate(item.createdAt)}
                            </span>
                          </p>
                          {item.dueAt && (
                            <p className="text-muted-foreground text-[11px]">
                              Son Tarih: {formatDate(item.dueAt)}
                            </p>
                          )}
                        </div>
                      </div>

                      {item.completedAt && (
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Tamamlayan:</span>{" "}
                            {item.completedBy} · {formatDate(item.completedAt)}
                            {item.outcome && (
                              <span className="ml-2 font-medium">
                                (Sonuç: {item.outcome === "completed" ? "Tamamlandı" : item.outcome})
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Pagination Footer */}
        {data && data.totalCount > data.pageSize && (
          <div className="border-t border-border/60 bg-muted/20 px-5 py-2.5 flex items-center justify-between text-xs shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || page <= 1}
              onClick={() => setPage((v) => Math.max(1, v - 1))}
              className="h-7 text-xs"
            >
              Önceki
            </Button>
            <span className="text-muted-foreground">
              Sayfa {page} / {Math.ceil(data.totalCount / data.pageSize)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending || page * data.pageSize >= data.totalCount}
              onClick={() => setPage((v) => v + 1)}
              className="h-7 text-xs"
            >
              Sonraki
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

