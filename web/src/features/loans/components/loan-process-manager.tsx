"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Search,
  FileStack,
  CheckCircle2,
  TriangleAlert,
  RotateCcw,
  FolderArchive,
  X,
  User,
  UserCheck,
  Calendar,
  HandCoins,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel, EmptyState } from "@/components/ui/page";
import { ExportCsvButton } from "@/components/export-csv-button";
import { LoanCheckoutForm } from "./loan-checkout-form";
import { ReturnLoanButton } from "./return-loan-button";
import { LoanTimelineModal } from "./loan-timeline-modal";
import { loanStatusLabels, type LoanDetailsItem } from "../model/loan";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import type { LoanBorrower } from "../api/loan-selection-actions";
import type { Branding } from "@/features/branding/model/branding";
import { cn } from "@/lib/utils";

export function LoanProcessManager({
  initialLoans,
  availableFolders,
  totalCount,
  page,
  filters,
  availableFolderCount,
  initialBorrowers = [],
  initialBorrowerCount = 0,
  stats = { active: 0, overdue: 0, returned: 0 },
  branding,
}: {
  totalCount: number;
  page: number;
  availableFolderCount: number;
  filters: { status: string; overdueOnly: boolean; borrowerSubjectId: string };
  initialLoans: LoanDetailsItem[];
  availableFolders: FolderListItem[];
  initialBorrowers?: LoanBorrower[];
  initialBorrowerCount?: number;
  stats?: { active: number; overdue: number; returned: number };
  branding?: Branding | null;
}) {
  const [clientSearch, setClientSearch] = useState("");
  const [receiptModalLoan, setReceiptModalLoan] = useState<LoanDetailsItem | null>(null);

  const date = (value: string) =>
    new Date(value).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Europe/Istanbul",
    });

  function href(values: Record<string, string>) {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.overdueOnly) params.set("overdueOnly", "true");
    if (filters.borrowerSubjectId)
      params.set("borrowerSubjectId", filters.borrowerSubjectId);
    for (const [key, value] of Object.entries(values))
      value ? params.set(key, value) : params.delete(key);
    return `/odunc?${params.toString()}`;
  }

  // Filter items in client for fast instant search (title, barcode, SDP, borrower, purpose)
  const filteredLoans = useMemo(() => {
    if (!clientSearch.trim()) return initialLoans;
    const q = clientSearch.trim().toLowerCase();
    return initialLoans.filter(
      (l) =>
        l.folderBarcode.toLowerCase().includes(q) ||
        l.folderTitle.toLowerCase().includes(q) ||
        l.filePlanCode.toLowerCase().includes(q) ||
        l.borrowerSubjectId.toLowerCase().includes(q) ||
        Boolean(l.checkedOutBy && l.checkedOutBy.toLowerCase().includes(q)) ||
        l.purpose.toLowerCase().includes(q),
    );
  }, [initialLoans, clientSearch]);

  const lastPage = Math.max(1, Math.ceil(totalCount / 50));
  const isAnyFilterActive =
    Boolean(filters.status) ||
    Boolean(filters.overdueOnly) ||
    Boolean(filters.borrowerSubjectId) ||
    Boolean(clientSearch);

  return (
    <div className="flex flex-col gap-5">
      {/* KPI Metric Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Link
          href="/odunc"
          className={cn(
            "group relative rounded-xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between min-h-[110px] transition-all hover:border-primary/50 hover:shadow-sm",
            !filters.status && !filters.overdueOnly
              ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02]"
              : "",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Toplam Zimmet
              </span>
              <h3 className="text-2xl font-black text-foreground mt-1">
                {totalCount.toLocaleString("tr-TR")}
              </h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <FileStack className="size-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Dolaşımda: <strong className="text-foreground font-semibold">{stats.active.toLocaleString("tr-TR")}</strong></span>
            <span>İade: <strong className="text-foreground font-semibold">{stats.returned.toLocaleString("tr-TR")}</strong></span>
          </div>
        </Link>

        <Link
          href={href({ status: "Active", overdueOnly: "" })}
          className={cn(
            "group relative rounded-xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between min-h-[110px] transition-all hover:border-amber-500/50 hover:shadow-sm",
            filters.status === "Active"
              ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/[0.02]"
              : "",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Aktif Zimmette
              </span>
              <h3 className="text-2xl font-black text-foreground mt-1">
                {stats.active.toLocaleString("tr-TR")}
              </h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <HandCoins className="size-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Klasör: <strong className="text-foreground font-semibold">Dolaşımda</strong></span>
            <span>Geciken: <strong className="text-foreground font-semibold">{stats.overdue.toLocaleString("tr-TR")}</strong></span>
          </div>
        </Link>

        <Link
          href={href({ status: "", overdueOnly: "true" })}
          className={cn(
            "group relative rounded-xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between min-h-[110px] transition-all hover:border-destructive/50 hover:shadow-sm",
            filters.overdueOnly
              ? "border-destructive ring-2 ring-destructive/20 bg-destructive/[0.02]"
              : "",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-destructive">
                Gecikmiş İade
              </span>
              <h3 className={cn("text-2xl font-black mt-1", stats.overdue > 0 ? "text-destructive" : "text-foreground")}>
                {stats.overdue.toLocaleString("tr-TR")}
              </h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Clock className="size-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Durum: <strong className="text-foreground font-semibold">Süresi Geçti</strong></span>
            <span>İhtar: <strong className={cn("font-semibold", stats.overdue > 0 ? "text-destructive" : "text-foreground")}>Gerekiyor</strong></span>
          </div>
        </Link>

        <Link
          href={href({ status: "Returned", overdueOnly: "" })}
          className={cn(
            "group relative rounded-xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between min-h-[110px] transition-all hover:border-emerald-500/50 hover:shadow-sm",
            filters.status === "Returned"
              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.02]"
              : "",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                İade Alınan
              </span>
              <h3 className="text-2xl font-black text-foreground mt-1">
                {stats.returned.toLocaleString("tr-TR")}
              </h3>
            </div>
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Statü: <strong className="text-foreground font-semibold">Arşivde</strong></span>
            <span>Müsait: <strong className="text-foreground font-semibold">Kullanılabilir</strong></span>
          </div>
        </Link>
      </div>

      {/* Filter & Action Toolbar */}
      <section
        aria-label="Ödünç kayıtlarını filtrele"
        className="space-y-3.5 rounded-xl border border-border/80 bg-card p-4 shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          {/* Status Tabs */}
          <nav aria-label="Zimmet durumu" className="flex flex-wrap gap-1.5">
            {[
              { label: "Tüm kayıtlar", status: "", overdue: "", count: totalCount },
              { label: "Zimmette", status: "Active", overdue: "", count: stats.active },
              { label: "Gecikmiş", status: "", overdue: "true", count: stats.overdue },
              { label: "İade alınan", status: "Returned", overdue: "", count: stats.returned },
            ].map((tab) => {
              const isActive =
                filters.status === tab.status &&
                filters.overdueOnly === Boolean(tab.overdue);
              return (
                <Link
                  key={tab.label}
                  href={href({ status: tab.status, overdueOnly: tab.overdue })}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px]",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground font-semibold"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Top Right Action: Popup Checkout Trigger */}
          <div className="flex items-center gap-2 ml-auto">
            <LoanCheckoutForm
              initialFolders={availableFolders}
              folderCount={availableFolderCount}
              initialBorrowers={initialBorrowers}
              borrowerCount={initialBorrowerCount}
              onLoanCreated={(newLoan) => {
                setReceiptModalLoan(newLoan);
              }}
            />
          </div>
        </div>

        {/* Detailed Search Filters */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end">
          {/* Server Borrower Filter */}
          <form className="sm:col-span-6 flex items-end gap-2">
            {filters.status && (
              <input type="hidden" name="status" value={filters.status} />
            )}
            {filters.overdueOnly && (
              <input type="hidden" name="overdueOnly" value="true" />
            )}
            <div className="min-w-0 flex-1">
              <label
                htmlFor="borrower-filter-input"
                className="block text-xs font-medium text-muted-foreground"
              >
                Teslim alan kullanıcı kimliği
              </label>
              <div className="relative mt-1">
                <User
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="borrower-filter-input"
                  name="borrowerSubjectId"
                  defaultValue={filters.borrowerSubjectId}
                  placeholder="Kullanıcı kimliğiyle sunucuda filtrele..."
                  className="h-9 pl-9 text-xs"
                />
              </div>
            </div>
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-3.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 shadow-xs"
            >
              Filtrele
            </button>
          </form>

          {/* Instant Client Search Filter */}
          <div className="sm:col-span-5">
            <label
              htmlFor="client-search-input"
              className="block text-xs font-medium text-muted-foreground"
            >
              Bu sayfada hızlı ara (Barkod, Başlık, SDP, Gerekçe)
            </label>
            <div className="relative mt-1">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="client-search-input"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Barkod ya da kelime yazın..."
                className="h-9 pl-9 pr-8 text-xs"
              />
              {clientSearch && (
                <button
                  type="button"
                  onClick={() => setClientSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Aramayı temizle"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </div>
          </div>

          {/* Reset Filters */}
          <div className="sm:col-span-1 flex justify-end">
            {isAnyFilterActive && (
              <Link
                href="/odunc"
                onClick={() => setClientSearch("")}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="Tüm filtreleri sıfırla"
              >
                <RotateCcw className="size-3" aria-hidden />
                <span className="sm:hidden">Temizle</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Main Table Panel */}
      <Panel
        title={`${filteredLoans.length} / ${totalCount.toLocaleString("tr-TR")} Ödünç Kaydı`}
        description="Fiziksel klasörlerin zimmet durumu, iade takvimi ve teslim alan personeller."
        actions={
          <ExportCsvButton
            name="odunc"
            headers={[
              "Barkod",
              "Dosya başlığı",
              "Teslim eden",
              "Teslim alan",
              "Gerekçe",
              "Son iade tarihi",
              "Durum",
            ]}
            rows={filteredLoans.map((l) => [
              l.folderBarcode,
              l.folderTitle,
              l.checkedOutBy || "Arşiv Görevlisi",
              l.borrowerSubjectId,
              l.purpose,
              l.dueAt,
              l.isOverdue ? "Gecikmiş" : loanStatusLabels[l.status] ?? l.status,
            ])}
          />
        }
      >
        {!filteredLoans.length ? (
          <EmptyState
            icon={ClipboardList}
            title={
              clientSearch
                ? `"${clientSearch}" ile eşleşen ödünç kaydı bulunamadı`
                : "Bu kapsamda ödünç kaydı yok"
            }
            description={
              clientSearch
                ? "Arama terimini değiştirin veya sağdaki temizle butonuna tıklayın."
                : "Durum veya kullanıcı filtresini değiştirin. Yeni teslim işlemi için üstteki 'Yeni ödünç / zimmet kaydı' butonunu kullanabilirsiniz."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-sm">
              <thead className="bg-muted/50 text-xs font-medium text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Fiziksel Klasör
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Teslim Eden (Yetkili)
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Teslim Alan (Personel)
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Zimmet Gerekçesi
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    İade Takvimi & Kalan Süre
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Durum
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredLoans.map((l) => {
                  const isReturned = l.status === "Returned";
                  const dueTime = new Date(l.dueAt).getTime();
                  const remainingDays = Math.ceil(
                    (dueTime - Date.now()) / (1000 * 60 * 60 * 24),
                  );

                  return (
                    <tr
                      key={l.id}
                      className="transition-colors hover:bg-muted/30 align-top"
                    >
                      {/* Klasör Bilgisi */}
                      <td className="max-w-72 px-4 py-3.5">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <FolderArchive className="size-3.5" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/dosya-islemleri/${l.folderId}`}
                              className="font-medium text-foreground hover:text-primary hover:underline line-clamp-1"
                            >
                              {l.folderTitle || l.folderBarcode}
                            </Link>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                {l.folderBarcode}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0 h-4 border-muted-foreground/30 text-muted-foreground"
                              >
                                SDP {l.filePlanCode}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Teslim Eden */}
                      <td className="max-w-44 px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <UserCheck className="size-3.5" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate" title={l.checkedOutBy || "Arşiv Görevlisi"}>
                              {l.checkedOutBy || "Arşiv Görevlisi"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {date(l.checkedOutAt)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Teslim Alan */}
                      <td className="max-w-44 px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                            {l.borrowerSubjectId.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate" title={l.borrowerSubjectId}>
                              {l.borrowerSubjectId}
                            </p>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Personel
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Gerekçe */}
                      <td className="max-w-64 px-4 py-3.5 text-xs text-muted-foreground leading-relaxed">
                        <p className="line-clamp-2">{l.purpose}</p>
                      </td>

                      {/* İade Takvimi */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <Calendar className="size-3.5 text-muted-foreground" aria-hidden />
                          {date(l.dueAt)}
                        </div>

                        {isReturned ? (
                          <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            İade: {date(l.returnedAt ?? l.dueAt)}
                          </p>
                        ) : l.isOverdue || l.daysOverdue > 0 ? (
                          <p className="mt-1 text-[11px] font-semibold text-destructive">
                            ⚠️ {l.daysOverdue > 0 ? `${l.daysOverdue} gün gecikti` : "Süresi geçti"}
                          </p>
                        ) : remainingDays <= 0 ? (
                          <p className="mt-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            ⏳ Bugün son gün
                          </p>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            ⏳ {remainingDays} gün kaldı
                          </p>
                        )}
                      </td>

                      {/* Durum */}
                      <td className="px-4 py-3.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs whitespace-nowrap font-medium gap-1.5",
                            isReturned
                              ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5"
                              : l.isOverdue
                                ? "border-destructive/30 text-destructive bg-destructive/5"
                                : "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              isReturned
                                ? "bg-emerald-500"
                                : l.isOverdue
                                  ? "bg-destructive animate-pulse"
                                  : "bg-blue-500",
                            )}
                          />
                          {l.isOverdue
                            ? "Gecikmiş"
                            : loanStatusLabels[l.status] ?? l.status}
                        </Badge>
                        {isReturned && l.returnNote && (
                          <p
                            className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground italic truncate max-w-[170px]"
                            title={`İade Notu: ${l.returnNote}`}
                          >
                            <MessageSquare className="size-3 shrink-0 text-emerald-600" aria-hidden />
                            <span className="truncate">&ldquo;{l.returnNote}&rdquo;</span>
                          </p>
                        )}
                      </td>

                      {/* İşlem */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <LoanTimelineModal loan={l} branding={branding} />
                          {!isReturned ? (
                            <ReturnLoanButton
                              loanId={l.id}
                              folderBarcode={l.folderBarcode}
                              borrowerSubjectId={l.borrowerSubjectId}
                              folderTitle={l.folderTitle}
                              onReturned={(returnNote) => {
                                const returnedLoan: LoanDetailsItem = {
                                  ...l,
                                  status: "Returned",
                                  returnedAt: new Date().toISOString(),
                                  returnNote: returnNote || "Eksiksiz ve hasarsız teslim alındı.",
                                  isOverdue: false,
                                  daysOverdue: 0,
                                };
                                setReceiptModalLoan(returnedLoan);
                              }}
                            />
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-3.5" aria-hidden />
                              <span>Teslim Alındı</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Pagination */}
      <nav
        aria-label="Ödünç kayıtları sayfaları"
        className="flex items-center justify-between gap-3 text-xs"
      >
        <span className="text-muted-foreground">
          Sayfa {page} / {lastPage}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted font-medium text-foreground transition-colors"
              href={href({ page: String(page - 1) })}
            >
              Önceki
            </Link>
          )}
          {page < lastPage && (
            <Link
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted font-medium text-foreground transition-colors"
              href={href({ page: String(page + 1) })}
            >
              Sonraki
            </Link>
          )}
        </div>
      </nav>

      {/* Otomatik Açılan Teslim / İade Tutanağı */}
      {receiptModalLoan && (
        <LoanTimelineModal
          loan={receiptModalLoan}
          branding={branding}
          open={Boolean(receiptModalLoan)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setReceiptModalLoan(null);
          }}
          initialTab="receipt"
          triggerHidden={true}
        />
      )}
    </div>
  );
}
