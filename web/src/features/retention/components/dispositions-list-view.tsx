"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Gavel,
  Search,
  X,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  UserCheck,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/page";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import { DispositionReceiptDialog } from "./disposition-receipt-dialog";
import type {
  Disposition,
  DispositionStatus,
} from "../model/disposition";
import { dispositionStatusLabels } from "../model/disposition";
import { actionLabels } from "../model/retention";

type StatusFilter = "all" | DispositionStatus;

export function DispositionsListView({
  items,
  canPrepare = false,
}: {
  items: Disposition[];
  canPrepare?: boolean;
}) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  // KPI counts
  const counts = useMemo(() => {
    return {
      all: items.length,
      Draft: items.filter((d) => d.status === "Draft").length,
      UnderReview: items.filter((d) => d.status === "UnderReview").length,
      PendingApproval: items.filter((d) => d.status === "PendingApproval").length,
      Approved: items.filter((d) => d.status === "Approved").length,
      Completed: items.filter((d) => d.status === "Completed").length,
      Rejected: items.filter((d) => d.status === "Rejected").length,
    };
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let list = items;

    if (filter !== "all") {
      list = list.filter((d) => d.status === filter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.commissionReference?.toLowerCase().includes(q) ||
          d.reason?.toLowerCase().includes(q) ||
          d.createdBy?.toLowerCase().includes(q) ||
          d.documentId?.toLowerCase().includes(q) ||
          (actionLabels[d.action] ?? "").toLowerCase().includes(q) ||
          (dispositionStatusLabels[d.status] ?? "").toLowerCase().includes(q),
      );
    }

    return list;
  }, [items, filter, search]);

  return (
    <div className="space-y-5">
      {/* KPI İstatistik Kartları */}
      <section
        aria-label="Komisyon işlem istatistikleri"
        className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
      >
        <StatTile
          label="Toplam İşlem"
          value={counts.all}
          hint="Tüm süreç kayıtları"
          icon={Layers}
        />
        <StatTile
          label="Komisyonda"
          value={counts.UnderReview}
          hint="Görüş bekleyen"
          icon={Gavel}
          tone={counts.UnderReview > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Onay Bekleyen"
          value={counts.PendingApproval}
          hint="Nihai karar aşaması"
          icon={Clock}
          tone={counts.PendingApproval > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Tamamlanan"
          value={counts.Completed}
          hint="Tutanakla kapanan"
          icon={CheckCircle2}
          tone={counts.Completed > 0 ? "success" : "neutral"}
        />
        <StatTile
          label="Taslak / Red"
          value={counts.Draft + counts.Rejected}
          hint={`${counts.Draft} taslak, ${counts.Rejected} red`}
          icon={AlertCircle}
          tone={counts.Rejected > 0 ? "danger" : "neutral"}
        />
      </section>

      {/* Üst İşlem Çubuğu: Arama, Filtreler ve Yeni Değerlendirme Butonu */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Arama Kutusu */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Referans no, gerekçe veya hazırlayan ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 text-xs sm:text-sm h-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Yeni Değerlendirme Butonu */}
        {canPrepare && (
          <Link
            href="/devir-imha/yeni"
            className={cn(
              buttonVariants({ size: "sm", variant: "default" }),
              "gap-1.5 shadow-sm font-medium self-start sm:self-auto",
            )}
          >
            <Plus className="size-4" />
            <span>Yeni Değerlendirme Başlat</span>
          </Link>
        )}
      </div>

      {/* Durum Filtre Butonları */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-1.5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <span>Tümü</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("Draft")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "Draft"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <span>Taslak</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
            {counts.Draft}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("UnderReview")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "UnderReview"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Gavel className="size-3.5" />
          <span>Komisyonda</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
            {counts.UnderReview}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("PendingApproval")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "PendingApproval"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Clock className="size-3.5" />
          <span>Nihai Onay Bekliyor</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
            {counts.PendingApproval}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("Approved")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "Approved"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <UserCheck className="size-3.5" />
          <span>Onaylandı (Yürütme)</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
            {counts.Approved}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("Completed")}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === "Completed"
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <CheckCircle2 className="size-3.5" />
          <span>Tamamlandı</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
            {counts.Completed}
          </span>
        </button>

        {counts.Rejected > 0 && (
          <button
            type="button"
            onClick={() => setFilter("Rejected")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === "Rejected"
                ? "bg-destructive text-destructive-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <XCircle className="size-3.5" />
            <span>Reddedildi</span>
            <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
              {counts.Rejected}
            </span>
          </button>
        )}
      </div>

      {/* Süreç Kartları Listesi */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="İşlem kaydı bulunamadı"
          description={
            search
              ? `"${search}" aramasına uygun komisyon kaydı bulunamadı.`
              : "Bu duruma uygun bir komisyon / devir işlemi bulunmuyor."
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredItems.map((item) => {
            const isCompleted = item.status === "Completed";
            const isRejected = item.status === "Rejected";
            const isApproved = item.status === "Approved";
            const isUnderReview = item.status === "UnderReview";
            const isPendingApproval = item.status === "PendingApproval";

            return (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-md"
              >
                <div>
                  {/* Başlık ve Durum */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                    <div>
                      <Link
                        href={`/devir-imha/islemler/${item.id}`}
                        className="text-base font-semibold text-primary hover:underline inline-flex items-center gap-1.5"
                      >
                        <Gavel className="size-4 text-primary" />
                        <span>{actionLabels[item.action] ?? item.action} Değerlendirmesi</span>
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Ref: {item.commissionReference || "Referans yazılmamış"}
                      </p>
                    </div>

                    <Badge
                      variant={
                        isCompleted
                          ? "success"
                          : isRejected
                          ? "destructive"
                          : isUnderReview || isPendingApproval
                          ? "warning"
                          : "outline"
                      }
                      className="text-xs"
                    >
                      {dispositionStatusLabels[item.status as DispositionStatus] ?? item.status}
                    </Badge>
                  </div>

                  {/* Detay Bilgileri */}
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Komisyon Görüşü</dt>
                      <dd className="mt-0.5 font-medium flex items-center gap-1.5">
                        <span
                          className={`font-semibold tabular-nums ${
                            item.reviews.length >= item.requiredReviews
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {item.reviews.length} / {item.requiredReviews}
                        </span>
                        <span className="text-muted-foreground">üye görüş bildirdi</span>
                      </dd>
                    </div>

                    <div>
                      <dt className="text-muted-foreground">Hazırlayan Personel</dt>
                      <dd className="mt-0.5 font-medium truncate" title={item.createdBy}>
                        {item.createdBy}
                      </dd>
                    </div>

                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Gerekçe</dt>
                      <dd className="mt-0.5 text-foreground line-clamp-2 text-xs leading-relaxed bg-muted/20 p-2 rounded border border-border">
                        {item.reason}
                      </dd>
                    </div>

                    {isCompleted && item.completedAt && (
                      <div className="col-span-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-emerald-800 dark:text-emerald-300">
                        <span className="font-semibold block">İşlem Tamamlandı</span>
                        <span className="text-[11px]">
                          {item.completedBy} · {new Date(item.completedAt).toLocaleString("tr-TR")}
                        </span>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Alt Aksiyon Butonları */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                  <div>
                    {isCompleted && (
                      <DispositionReceiptDialog
                        process={item}
                        triggerLabel="Resmi Tutanağı Gör"
                        triggerVariant="outline"
                        triggerSize="sm"
                      />
                    )}
                  </div>

                  <Link
                    href={`/devir-imha/islemler/${item.id}`}
                    className={cn(buttonVariants({ size: "sm", variant: "default" }), "gap-1 text-xs")}
                  >
                    <span>Süreci Aç & İncele</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
