"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Search,
  CheckCircle2,
  AlarmClock,
  User,
  FileText,
  X,
  UserCheck,
  Calendar,
  Layers,
  ArrowUpRight,
  RotateCcw,
  History,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, EmptyState } from "@/components/ui/page";
import { ExportCsvButton } from "@/components/export-csv-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { completeWorkflowTaskAction } from "@/features/workflow/api/complete-task-action";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";
import {
  workItemStatusLabels,
  workItemStatusVariants,
  type WorkflowWorkItem,
} from "@/features/workflow/model/workflow";
import { TaskCreateDialog } from "./task-create-dialog";
import { TaskReassignDialog } from "./task-reassign-dialog";
import { TaskHistoryDialog } from "./task-history-dialog";
import { TaskReceiptDialog } from "./task-receipt-dialog";
import { cn } from "@/lib/utils";

export function TaskProcessManager({
  items,
  titles = {},
  canAssign = false,
  subject = "",
}: {
  items: WorkflowWorkItem[];
  titles?: Record<string, string>;
  canAssign?: boolean;
  subject?: string;
}) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  type FilterType = "all" | "mine" | "unassigned" | "completed" | "overdue";
  const [filter, setFilter] = useState<FilterType>("all");
  const [clientSearch, setClientSearch] = useState("");

  // Statistics
  const totalCount = items.length;
  const completedCount = useMemo(
    () => items.filter((item) => item.status === "Completed").length,
    [items],
  );
  const mineCount = useMemo(
    () => items.filter((item) => item.status !== "Completed" && item.assigneeSubjectId === subject).length,
    [items, subject],
  );
  const unassignedCount = useMemo(
    () => items.filter((item) => item.status !== "Completed" && !item.assigneeSubjectId).length,
    [items],
  );
  const overdueCount = useMemo(
    () => items.filter((item) => item.status !== "Completed" && item.isOverdue).length,
    [items],
  );

  // Client-side instant filter and search
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by tab
    if (filter === "mine") {
      result = result.filter((item) => item.status !== "Completed" && item.assigneeSubjectId === subject);
    } else if (filter === "unassigned") {
      result = result.filter((item) => item.status !== "Completed" && !item.assigneeSubjectId);
    } else if (filter === "completed") {
      result = result.filter((item) => item.status === "Completed");
    } else if (filter === "overdue") {
      result = result.filter((item) => item.status !== "Completed" && item.isOverdue);
    }

    // Search query
    if (clientSearch.trim()) {
      const q = clientSearch.trim().toLowerCase();
      result = result.filter((item) => {
        const title = (titles[item.documentId] ?? "").toLowerCase();
        const node = (item.nodeName ?? "").toLowerCase();
        const def = (item.definitionName ?? "").toLowerCase();
        const assignee = (item.assigneeSubjectId ?? "").toLowerCase();
        const completedBy = (item.completedBy ?? "").toLowerCase();
        const outcome = (item.outcome ?? "").toLowerCase();
        return (
          node.includes(q) ||
          def.includes(q) ||
          title.includes(q) ||
          assignee.includes(q) ||
          completedBy.includes(q) ||
          outcome.includes(q)
        );
      });
    }

    return result;
  }, [items, filter, clientSearch, subject, titles]);

  // CSV export rows
  const csvRows = useMemo(() => {
    return filteredItems.map((item) => [
      item.nodeName || "Tanımsız",
      item.definitionName || "",
      titles[item.documentId] || item.documentId,
      item.assigneeSubjectId || "Atama bekliyor",
      item.status === "Completed" ? "Tamamlandı" : item.status === "Escalated" ? "Yükseltildi" : "Açık",
      item.completedBy || "—",
      item.completedAt ? formatDate(item.completedAt) : "—",
      item.outcome || "—",
      item.isOverdue ? "Evet" : "Hayır",
      formatDate(item.createdAt),
      item.dueAt ? formatDate(item.dueAt) : "—",
    ]);
  }, [filteredItems, titles]);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. KPI Metrik Özet Şeridi */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "group relative rounded-xl border border-border/80 bg-card p-3.5 shadow-xs flex flex-col justify-between min-h-[104px] text-left transition-all hover:border-primary/50 hover:shadow-sm",
            filter === "all"
              ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02]"
              : "",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Toplam Görev
              </span>
              <h3 className="text-2xl font-black text-foreground mt-1">
                {totalCount}
              </h3>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardList className="size-5" aria-hidden />
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mt-2">
            <span>Süreç kapsamındaki tüm görevler</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("mine")}
          className={cn(
            "group relative rounded-xl border border-border/80 bg-card p-3.5 shadow-xs flex flex-col justify-between min-h-[104px] text-left transition-all hover:border-primary/50 hover:shadow-sm",
            filter === "mine"
              ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02]"
              : "",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Bana Atanan
              </span>
              <h3 className="text-2xl font-black text-foreground mt-1">
                {mineCount}
              </h3>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UserCheck className="size-5" aria-hidden />
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 mt-2">
            <span>Doğrudan üzerinizde olan işler</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("unassigned")}
          className={cn(
            "group relative rounded-xl border border-border/80 bg-card p-3.5 shadow-xs flex flex-col justify-between min-h-[104px] text-left transition-all hover:border-primary/50 hover:shadow-sm",
            filter === "unassigned"
              ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02]"
              : "",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Atama Bekleyen
              </span>
              <h3 className="text-2xl font-black text-foreground mt-1">
                {unassignedCount}
              </h3>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <User className="size-5" aria-hidden />
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-2">
            <span>Personel bekleyen açık işler</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("completed")}
          className={cn(
            "group relative rounded-xl border border-border/80 bg-card p-3.5 shadow-xs flex flex-col justify-between min-h-[104px] text-left transition-all hover:border-emerald-500/50 hover:shadow-sm",
            filter === "completed"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.02]"
              : "",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Tamamlananlar
              </span>
              <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {completedCount}
              </h3>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" aria-hidden />
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-2">
            <span>Tamamlanmış süreç adımları</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("overdue")}
          className={cn(
            "group relative rounded-xl border border-border/80 bg-card p-3.5 shadow-xs flex flex-col justify-between min-h-[104px] text-left transition-all hover:border-destructive/50 hover:shadow-sm col-span-2 sm:col-span-1",
            filter === "overdue"
              ? "border-destructive ring-2 ring-destructive/20 bg-destructive/[0.02]"
              : "",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">
                Süresi Geçen
              </span>
              <h3 className="text-2xl font-black text-destructive mt-1">
                {overdueCount}
              </h3>
            </div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <AlarmClock className="size-5" aria-hidden />
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-destructive mt-2">
            <span>{overdueCount > 0 ? "İvedi inceleme gerektirir" : "Geciken görev yok"}</span>
          </div>
        </button>
      </div>

      {/* 2. Kontrol ve Araç Çubuğu (Toolbar) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-xs">
        <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2.5">
          {/* Anlık İstemci Araması */}
          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Görev, belge veya personel ara..."
              className="h-9 pl-9 text-xs rounded-xl bg-muted/20 border-border/70 focus-visible:ring-primary/20"
            />
            {clientSearch && (
              <button
                type="button"
                onClick={() => setClientSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>

          {/* Filtreleme Sekmeleri */}
          <div
            role="group"
            aria-label="Görev filtresi"
            className="flex items-center gap-1 overflow-x-auto"
          >
            {[
              { id: "all", label: "Tümü" },
              { id: "mine", label: "Bana atanan" },
              { id: "unassigned", label: "Atama bekleyen" },
              { id: "completed", label: "Tamamlananlar / Geçmiş" },
              { id: "overdue", label: "Süresi geçen" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={filter === tab.id}
                onClick={() => setFilter(tab.id as typeof filter)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  filter === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Aksiyon Düğmeleri */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 text-xs rounded-xl hover:bg-muted"
            title="Listeyi Yenile"
          >
            <RotateCcw className={cn("size-3.5", isRefreshing && "animate-spin")} aria-hidden />
            <span className="hidden sm:inline">Yenile</span>
          </Button>
          <ExportCsvButton
            name="gorevlerim-listesi"
            headers={[
              "Görev Adımı",
              "Süreç Tanımı",
              "İlgili Belge",
              "Atanan Personel",
              "Durum",
              "Tamamlayan",
              "Tamamlanma Tarihi",
              "Sonuç",
              "Süresi Geçti",
              "Oluşturulma Tarihi",
              "Son Tarih",
            ]}
            rows={csvRows}
          />
          {canAssign && <TaskCreateDialog />}
        </div>
      </div>

      {/* 3. Görev Listesi */}
      {filteredItems.length === 0 ? (
        items.length === 0 ? (
          <Panel>
            <EmptyState
              icon={ClipboardList}
              title="Kayıtlı görev bulunmuyor"
              description="Size atanmış veya yetkiniz kapsamındaki iş akışı görevleri burada listelenir. Yeni bir görev oluşturmak için yukarıdaki düğmeyi kullanabilirsiniz."
            />
          </Panel>
        ) : (
          <p
            role="status"
            className="rounded-xl border border-border/80 bg-card p-6 text-center text-xs text-muted-foreground shadow-xs"
          >
            {filter === "completed"
              ? "Henüz tamamlanmış geçmiş bir görev kaydı bulunmuyor."
              : "Görüntülenen kayıtlarda bu filtreye uyan görev yok."}
          </p>
        )
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredItems.map((item) => (
            <WorkItemCard
              key={item.id}
              item={item}
              title={titles[item.documentId]}
              canAssign={canAssign}
              subject={subject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkItemCard({
  item,
  title,
  canAssign,
  subject,
}: {
  item: WorkflowWorkItem;
  title?: string;
  canAssign: boolean;
  subject: string;
}) {
  const isCompleted = item.status === "Completed";
  const isMine = item.assigneeSubjectId === subject;
  const isUnassigned = !item.assigneeSubjectId;
  const canComplete = !isCompleted && (isUnassigned || isMine);
  const canReassign = !isCompleted && canAssign;

  return (
    <article className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Üst Başlık & Rozetler */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg font-bold text-xs",
              isCompleted
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-primary/10 text-primary",
            )}
          >
            {isCompleted ? (
              <CheckCircle2 className="size-3.5" aria-hidden />
            ) : (
              <Layers className="size-3.5" aria-hidden />
            )}
          </span>
          <h3 className="text-sm font-semibold text-foreground truncate">
            {item.nodeName || "Adı tanımsız adım"}
          </h3>
          <Badge
            variant={workItemStatusVariants[item.status] ?? "secondary"}
            className="text-[11px] font-normal"
          >
            {workItemStatusLabels[item.status] ?? item.status}
          </Badge>
          {!isCompleted && item.isOverdue && (
            <Badge variant="destructive" className="gap-1 text-[10px] h-5">
              <AlarmClock className="size-3" aria-hidden />
              Süresi geçti
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            · {item.definitionName}
          </span>
        </div>

        {/* Belge Bilgisi */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
          <span>Belge:</span>
          <Link
            href={`/documents/${item.documentId}`}
            className="font-medium text-primary hover:underline truncate inline-flex items-center gap-1"
          >
            <span>{title ?? "Belgeyi aç"}</span>
            <ArrowUpRight className="size-3 shrink-0" aria-hidden />
          </Link>
        </div>

        {/* Personel ve Tarih Bilgisi */}
        <div className="flex flex-wrap items-center gap-3 pt-0.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <User className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
            <span>Atanan Personel:</span>
            {item.assigneeSubjectId ? (
              <span className="font-semibold text-foreground">
                {item.assigneeSubjectId}
              </span>
            ) : (
              <span className="italic text-amber-600 dark:text-amber-400 font-medium">
                Henüz kişiye atanmadı
              </span>
            )}
          </div>

          <span className="text-border">|</span>

          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
            <span>Başlangıç: {formatDate(item.createdAt)}</span>
            {item.dueAt && !isCompleted && (
              <span className={cn(item.isOverdue ? "text-destructive font-medium" : "")}>
                · Son Tarih: {formatDate(item.dueAt)}
              </span>
            )}
          </div>
        </div>

        {/* Tamamlanma & Sonuç Detayı (Geçmiş Görevler) */}
        {isCompleted && item.completedAt && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs text-emerald-800 dark:text-emerald-300 flex flex-wrap items-center gap-2 mt-1">
            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Tamamlayan:</strong> {item.completedBy ?? "Sistem"} · {formatDate(item.completedAt)}
            </span>
            {item.outcome && (
              <span className="font-medium bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full text-[11px]">
                Sonuç: {item.outcome === "completed" ? "Tamamlandı" : item.outcome}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Aksiyonlar */}
      <div className="flex items-center gap-2 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
        <TaskHistoryDialog documentId={item.documentId} documentTitle={title} />
        {isCompleted && (
          <TaskReceiptDialog
            item={item}
            documentTitle={title}
            triggerLabel="Tutanak"
            triggerVariant="outline"
            triggerSize="sm"
          />
        )}
        {canComplete && <CompleteTaskDialog item={item} />}
        {canReassign && (
          <TaskReassignDialog item={item} documentTitle={title} />
        )}
      </div>
    </article>
  );
}

const initialState: ActionState = { status: "idle" };

function CompleteTaskDialog({ item }: { item: WorkflowWorkItem }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    completeWorkflowTaskAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Görev tamamlandı.");
      setIsOpen(false);
      router.refresh();
    }

    if (state.status === "error") {
      toast.error(state.message ?? "Görev tamamlanamadı.");
    }
  }, [state, router]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs rounded-lg font-medium"
          />
        }
      >
        <CheckCircle2 className="size-3.5" aria-hidden />
        Tamamla
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl p-5 border border-border/80 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Görevi tamamla</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {item.nodeName || "Adım"} · {item.definitionName}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4 mt-2">
          <input type="hidden" name="instanceId" value={item.instanceId} />

          {item.isManual ? (
            <>
              <input type="hidden" name="outcome" value="completed" />
              <p className="text-xs text-muted-foreground">
                Görevi tamamladığınızda açık görev listenizden kaldırılır ve iş akışında sonraki adıma geçilir.
              </p>
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`outcome-${item.id}`} className="text-xs font-semibold">
                Sonuç
              </Label>
              <Input
                id={`outcome-${item.id}`}
                name="outcome"
                placeholder="Örn: onaylandi"
                required
                className="h-9 rounded-xl text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Sonuç değeri iş akışı tanımındaki geçiş koşuluyla eşleşmelidir; eşleşmezse akış ilerlemez.
              </p>
            </div>
          )}

          {state.status === "error" && (
            <p role="alert" className="text-xs text-destructive">
              {state.message}
            </p>
          )}

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="h-8 text-xs rounded-lg"
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-xs"
            >
              {isPending ? "Gönderiliyor…" : "Tamamla"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("tr-TR", { dateStyle: "medium" });
}

