"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Search,
  X,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Gavel,
  ArrowUpRight,
  ExternalLink,
  ShieldAlert,
  PlayCircle,
  FileCheck2,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel, EmptyState } from "@/components/ui/page";
import { ExportCsvButton } from "@/components/export-csv-button";
import { CreateRuleDialog } from "./create-rule-dialog";
import type {
  RetentionCaseListItem,
  RetentionRuleListItem,
} from "../model/retention";
import { actionLabels, caseStatusLabels } from "../model/retention";

type CaseStatusFilter = "all" | "Eligible" | "Held" | "Scheduled" | "Completed";

const dateOnly = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function RetentionDashboardView({
  cases,
  rules,
  canManageRules = false,
  canPrepareDisposition = false,
}: {
  cases: RetentionCaseListItem[];
  rules: RetentionRuleListItem[];
  canManageRules?: boolean;
  canPrepareDisposition?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"cases" | "rules">("cases");
  const [caseFilter, setCaseFilter] = useState<CaseStatusFilter>("all");
  const [caseSearch, setCaseSearch] = useState("");
  const [ruleSearch, setRuleSearch] = useState("");

  // Counts for case filter tabs
  const counts = useMemo(() => {
    return {
      all: cases.length,
      Eligible: cases.filter((c) => c.status === "Eligible").length,
      Held: cases.filter((c) => c.status === "Held" || c.activeHoldCount > 0).length,
      Scheduled: cases.filter((c) => c.status === "Scheduled").length,
      Completed: cases.filter((c) => c.status === "Completed").length,
    };
  }, [cases]);

  // Filtered cases
  const filteredCases = useMemo(() => {
    let result = cases;

    // Status filter
    if (caseFilter === "Eligible") {
      result = result.filter((c) => c.status === "Eligible");
    } else if (caseFilter === "Held") {
      result = result.filter((c) => c.status === "Held" || c.activeHoldCount > 0);
    } else if (caseFilter === "Scheduled") {
      result = result.filter((c) => c.status === "Scheduled");
    } else if (caseFilter === "Completed") {
      result = result.filter((c) => c.status === "Completed");
    }

    // Text search
    if (caseSearch.trim()) {
      const q = caseSearch.toLowerCase();
      result = result.filter(
        (c) =>
          c.ruleCode?.toLowerCase().includes(q) ||
          c.documentId?.toLowerCase().includes(q) ||
          c.action?.toLowerCase().includes(q) ||
          (actionLabels[c.action] ?? "").toLowerCase().includes(q) ||
          (caseStatusLabels[c.status] ?? "").toLowerCase().includes(q),
      );
    }

    return result;
  }, [cases, caseFilter, caseSearch]);

  // Filtered rules
  const filteredRules = useMemo(() => {
    if (!ruleSearch.trim()) return rules;
    const q = ruleSearch.toLowerCase();
    return rules.filter(
      (r) =>
        r.code?.toLowerCase().includes(q) ||
        r.name?.toLowerCase().includes(q) ||
        r.action?.toLowerCase().includes(q) ||
        (actionLabels[r.action] ?? "").toLowerCase().includes(q),
    );
  }, [rules, ruleSearch]);

  return (
    <div className="space-y-4">
      {/* Üst Sekmeler ve Hızlı İşlem */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "cases" | "rules")}
        className="space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <TabsList className="h-9 p-1">
            <TabsTrigger value="cases" className="text-xs sm:text-sm gap-1.5">
              <FileText className="size-3.5" />
              <span>Tasfiye Kayıtları</span>
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.2 text-[11px] font-semibold">
                {cases.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="text-xs sm:text-sm gap-1.5">
              <Gavel className="size-3.5" />
              <span>Saklama Kuralları</span>
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.2 text-[11px] font-semibold">
                {rules.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {canManageRules && (
              <CreateRuleDialog
                triggerLabel="Yeni Saklama Kuralı"
                triggerVariant="default"
                triggerSize="sm"
              />
            )}
            <Link
              href="/devir-imha/islemler"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs")}
            >
              <Gavel className="size-3.5 text-primary" />
              <span>Komisyon & Devir</span>
            </Link>
          </div>
        </div>

        {/* 1. SEKME: TASFİYE KAYITLARI */}
        <TabsContent value="cases" className="space-y-4 m-0">
          {/* Arama & Durum Filtreleri */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Arama Kutusu */}
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Kural kodu, evrak kimliği veya karar ara…"
                value={caseSearch}
                onChange={(e) => setCaseSearch(e.target.value)}
                className="pl-9 pr-8 text-xs sm:text-sm h-9"
              />
              {caseSearch && (
                <button
                  type="button"
                  onClick={() => setCaseSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* CSV Dışa Aktar */}
            {filteredCases.length > 0 && (
              <ExportCsvButton
                name={`tasfiye-kayitlari-${new Date().toISOString().slice(0, 10)}`}
                headers={["Kural Kodu", "Belge ID", "Tasfiye Kararı", "Durum", "Tetiklenme Tarihi", "Vade Tarihi", "Aktif Bloke"]}
                rows={filteredCases.map((c) => [
                  c.ruleCode,
                  c.documentId,
                  actionLabels[c.action] ?? c.action,
                  caseStatusLabels[c.status] ?? c.status,
                  new Date(c.triggerAt).toLocaleDateString("tr-TR"),
                  c.dueAt ? new Date(c.dueAt).toLocaleDateString("tr-TR") : "Sürekli",
                  c.activeHoldCount,
                ])}
              />
            )}
          </div>

          {/* Durum Filtre Sekmeleri */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-1.5">
            <button
              type="button"
              onClick={() => setCaseFilter("all")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                caseFilter === "all"
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
              onClick={() => setCaseFilter("Eligible")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                caseFilter === "Eligible"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <CalendarClock className="size-3.5" />
              <span>Süresi Dolan</span>
              <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
                {counts.Eligible}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCaseFilter("Held")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                caseFilter === "Held"
                  ? "bg-destructive text-destructive-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Lock className="size-3.5" />
              <span>Hukuki Blokede</span>
              <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
                {counts.Held}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCaseFilter("Scheduled")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                caseFilter === "Scheduled"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Clock className="size-3.5" />
              <span>Planlanan</span>
              <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
                {counts.Scheduled}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCaseFilter("Completed")}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                caseFilter === "Completed"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <CheckCircle2 className="size-3.5" />
              <span>Tamamlananlar / Geçmiş</span>
              <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px]">
                {counts.Completed}
              </span>
            </button>
          </div>

          {/* Tablo Görünümü */}
          {filteredCases.length === 0 ? (
            <EmptyState
              title="Kayıt bulunamadı"
              description={
                caseSearch
                  ? `"${caseSearch}" aramasına uygun tasfiye kaydı bulunamadı.`
                  : "Bu filtreye uyan tasfiye kaydı yok."
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-36 font-semibold">Kural Kodu</TableHead>
                    <TableHead className="font-semibold">Belge Kimliği</TableHead>
                    <TableHead className="w-32 font-semibold">Tasfiye</TableHead>
                    <TableHead className="w-32 font-semibold">Durum</TableHead>
                    <TableHead className="w-28 font-semibold">Vade</TableHead>
                    <TableHead className="w-20 text-center font-semibold">Bloke</TableHead>
                    <TableHead className="w-36 text-right font-semibold">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((item) => {
                    const isEligible = item.status === "Eligible";
                    const isHeld = item.status === "Held" || item.activeHoldCount > 0;
                    const isCompleted = item.status === "Completed";

                    return (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        {/* Kural Kodu */}
                        <TableCell className="font-mono text-xs font-semibold">
                          <Link
                            href={`/devir-imha/dosyalar/${item.id}`}
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <span>{item.ruleCode}</span>
                            <ArrowUpRight className="size-3 text-muted-foreground" />
                          </Link>
                        </TableCell>

                        {/* Belge Kimliği */}
                        <TableCell className="font-mono text-xs">
                          <Link
                            href={`/documents/${item.documentId}`}
                            className="text-foreground hover:text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
                            title={item.documentId}
                          >
                            <FileText className="size-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{item.documentId.slice(0, 18)}…</span>
                          </Link>
                        </TableCell>

                        {/* Tasfiye Kararı */}
                        <TableCell className="text-xs">
                          <span className="font-medium">
                            {actionLabels[item.action] ?? item.action}
                          </span>
                        </TableCell>

                        {/* Durum Rozeti */}
                        <TableCell>
                          <Badge
                            variant={
                              isHeld
                                ? "destructive"
                                : isEligible
                                ? "warning"
                                : isCompleted
                                ? "success"
                                : "outline"
                            }
                            className="text-[11px]"
                          >
                            {caseStatusLabels[item.status] ?? item.status}
                          </Badge>
                        </TableCell>

                        {/* Vade Tarihi */}
                        <TableCell className="text-xs tabular-nums">
                          {item.dueAt ? (
                            <span className={isEligible ? "font-semibold text-amber-600" : ""}>
                              {dateOnly.format(new Date(item.dueAt))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">Sürekli</span>
                          )}
                        </TableCell>

                        {/* Bloke Sayısı */}
                        <TableCell className="text-center tabular-nums">
                          {item.activeHoldCount > 0 ? (
                            <span className="inline-flex items-center gap-0.5 font-semibold text-destructive">
                              <Lock className="size-3" />
                              {item.activeHoldCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">0</span>
                          )}
                        </TableCell>

                        {/* Hızlı Aksiyonlar */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isEligible && canPrepareDisposition && (
                              <Link
                                href={`/devir-imha/yeni?caseId=${item.id}`}
                                className={cn(
                                  buttonVariants({ size: "sm", variant: "default" }),
                                  "h-7 px-2 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1",
                                )}
                              >
                                <PlayCircle className="size-3" />
                                <span>Değerlendir</span>
                              </Link>
                            )}

                            <Link
                              href={`/devir-imha/dosyalar/${item.id}`}
                              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "h-7 px-2 text-xs")}
                            >
                              <span>İncele</span>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* 2. SEKME: SAKLAMA KURALLARI */}
        <TabsContent value="rules" className="space-y-4 m-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Kural Arama */}
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Kural kodu veya kural adı ara…"
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
                className="pl-9 pr-8 text-xs sm:text-sm h-9"
              />
              {ruleSearch && (
                <button
                  type="button"
                  onClick={() => setRuleSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {canManageRules && (
              <CreateRuleDialog
                triggerLabel="Yeni Saklama Kuralı Oluştur"
                triggerVariant="default"
                triggerSize="sm"
              />
            )}
          </div>

          {filteredRules.length === 0 ? (
            <EmptyState
              title="Kural bulunamadı"
              description={
                ruleSearch
                  ? `"${ruleSearch}" aramasına uygun saklama kuralı bulunamadı.`
                  : "Henüz tanımlanmış saklama kuralı bulunmuyor."
              }
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-40 font-semibold">Kural Kodu</TableHead>
                    <TableHead className="font-semibold">Kural Adı / Konu</TableHead>
                    <TableHead className="w-36 text-right font-semibold">Saklama Süresi</TableHead>
                    <TableHead className="w-40 font-semibold">Süre Sonu Kararı</TableHead>
                    <TableHead className="w-28 text-right font-semibold">Bağlı Kayıt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => (
                    <TableRow key={rule.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {rule.code}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm">
                        {rule.name}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums font-semibold">
                        {rule.retentionMonths} ay{" "}
                        <span className="text-muted-foreground font-normal">
                          ({Math.floor(rule.retentionMonths / 12)} yıl)
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="font-medium text-[11px]">
                          {actionLabels[rule.action] ?? rule.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums font-medium">
                        {rule.caseCount} dosya
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
