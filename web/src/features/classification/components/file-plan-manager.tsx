"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileStack,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderTree,
  Layers,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreateFilePlanDialog } from "./create-file-plan-dialog";
import { AddFilePlanNodeDialog } from "./add-file-plan-node-dialog";
import { DeleteFilePlanDialog, DeleteNodeDialog } from "./delete-dialogs";
import type {
  FilePlanListItem,
  FilePlanNode,
  FilePlanTree,
} from "@/features/classification/model/classification";

type TreeNode = FilePlanNode & { children: TreeNode[] };

const mockDiziPusulasi = [
  {
    row: 1,
    docNumber: "E-94285142-105.02-84192",
    date: "14.02.2026",
    title: "Battalgazi İlçesi 421 Ada 12 Parsel İmar Plan Tadilatı Meclis Kararı",
    unit: "İmar ve Şehircilik Dairesi",
    attachmentCount: 2,
    pageCount: 12,
  },
  {
    row: 2,
    docNumber: "E-94285100-105.02-83910",
    date: "02.02.2026",
    title: "Yeşilyurt Bostanbaşı Bölgesi 108 Ada Emsal Artışı Talebi ve Plan Paftası",
    unit: "İmar ve Şehircilik Dairesi",
    attachmentCount: 1,
    pageCount: 8,
  },
  {
    row: 3,
    docNumber: "E-93821094-105.02-82104",
    date: "18.01.2026",
    title: "Çöşnük Mahallesi Nazım İmar Planı Revizyonuna İlişkin Askı İtirazları",
    unit: "İmar ve Şehircilik Dairesi",
    attachmentCount: 4,
    pageCount: 26,
  },
];

export function FilePlanManager({
  initialPlans,
  initialTree,
}: {
  initialPlans: FilePlanListItem[];
  initialTree: FilePlanTree | null;
}) {
  const [plans, setPlans] = useState<FilePlanListItem[]>(initialPlans);
  const [activePlanId, setActivePlanId] = useState<string>(
    initialTree?.id ?? initialPlans[0]?.id ?? ""
  );

  const [nodes, setNodes] = useState<FilePlanNode[]>(initialTree?.items ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTree?.items?.[0]?.id ?? null
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  const activePlan = useMemo(
    () => plans.find((p) => p.id === activePlanId) ?? plans[0] ?? null,
    [plans, activePlanId]
  );

  // Filtrelenmiş düğümler ve arama eşleşmeleri
  const { filteredNodes, matchedCount } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { filteredNodes: nodes, matchedCount: 0 };
    }
    const q = searchQuery.toLowerCase().trim();
    const matchingIds = new Set<string>();
    let count = 0;

    for (const n of nodes) {
      if (n.code.toLowerCase().includes(q) || n.title.toLowerCase().includes(q)) {
        matchingIds.add(n.id);
        count++;
        // Üst ebeveynleri de görünür yap
        let currentParentId = n.parentId;
        while (currentParentId) {
          matchingIds.add(currentParentId);
          const parent = nodes.find((p) => p.id === currentParentId);
          currentParentId = parent?.parentId ?? null;
        }
      }
    }
    return {
      filteredNodes: nodes.filter((n) => matchingIds.has(n.id)),
      matchedCount: count,
    };
  }, [nodes, searchQuery]);

  const roots = useMemo(() => buildTree(filteredNodes), [filteredNodes]);

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(nodes.map((node) => node.id))
  );

  const selected = useMemo(
    () => nodes.find((node) => node.id === selectedId) ?? null,
    [nodes, selectedId]
  );

  // Seçili düğümün ekmek kırıntısı (Breadcrumb) yolu
  const breadcrumbs = useMemo(() => {
    if (!selected) return [];
    const trail: FilePlanNode[] = [selected];
    let currentParentId = selected.parentId;
    while (currentParentId) {
      const parent = nodes.find((n) => n.id === currentParentId);
      if (parent) {
        trail.unshift(parent);
        currentParentId = parent.parentId;
      } else {
        break;
      }
    }
    return trail;
  }, [selected, nodes]);

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // --- KULLANICI DOSTU AĞAÇ KONTROLLERİ ---
  function expandAll() {
    setExpanded(new Set(nodes.map((n) => n.id)));
    toast.success("Tüm tasnif ağacı genişletildi.");
  }

  function collapseAll() {
    setExpanded(new Set());
    toast.info("Tüm tasnif ağacı daraltıldı.");
  }

  function expandLevel(level: number) {
    // Yalnızca belirli bir seviyeye kadar olan düğümleri aç
    const toExpand = new Set<string>();
    for (const n of nodes) {
      if (n.level <= level) {
        toExpand.add(n.id);
      }
    }
    setExpanded(toExpand);
    toast.info(`Seviye ${level} düğümlerine kadar açıldı.`);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success(`'${code}' kodu panoya kopyalandı.`);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  // Standart Dosya Planını CSV/Excel olarak dışa aktar
  function exportToCsv() {
    if (nodes.length === 0) {
      toast.error("Dışa aktarılacak tasnif düğümü bulunamadı.");
      return;
    }

    const header = "Tasnif Kodu;Konu Başlığı;Seviye;Dosya Açılabilir;Durum\n";
    const rows = nodes
      .map(
        (n) =>
          `"${n.code}";"${n.title}";"${n.level}";"${n.isSelectable ? "Evet" : "Hayır"}";"${n.isActive ? "Aktif" : "Pasif"}"`
      )
      .join("\n");

    const blob = new Blob(["﻿" + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activePlan?.code ?? "Standart-Dosya-Plani"}-Envanter.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Standart dosya planı CSV/Excel formatında indirildi.");
  }

  function handlePlanCreated(newPlan: FilePlanListItem) {
    setPlans((prev) => [newPlan, ...prev]);
    setActivePlanId(newPlan.id);
    setNodes([]);
    setSelectedId(null);
  }

  function handlePlanDeleted(deletedPlanId: string) {
    const remaining = plans.filter((p) => p.id !== deletedPlanId);
    setPlans(remaining);
    if (remaining.length > 0) {
      setActivePlanId(remaining[0].id);
      setSelectedId(null);
    } else {
      setActivePlanId("");
      setNodes([]);
      setSelectedId(null);
    }
  }

  function handleNodeAdded(newNode: FilePlanNode) {
    setNodes((prev) => [...prev, newNode]);
    setSelectedId(newNode.id);
    if (newNode.parentId) {
      setExpanded((prev) => new Set([...prev, newNode.parentId!]));
    }
    if (activePlan) {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === activePlan.id ? { ...p, itemCount: p.itemCount + 1 } : p
        )
      );
    }
  }

  function handleNodeDeleted(deletedIds: string[]) {
    const deleteSet = new Set(deletedIds);
    setNodes((prev) => prev.filter((n) => !deleteSet.has(n.id)));
    if (selectedId && deleteSet.has(selectedId)) {
      setSelectedId(null);
    }
    if (activePlan) {
      setPlans((prev) =>
        prev.map((p) =>
          p.id === activePlan.id
            ? { ...p, itemCount: Math.max(0, p.itemCount - deletedIds.length) }
            : p
        )
      );
    }
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center flex flex-col items-center justify-center gap-3">
        <FolderTree className="size-10 text-muted-foreground opacity-50" />
        <h3 className="text-base font-bold text-foreground">Henüz Dosya Planı Tanımlanmamış</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Kurumsal arşivinizin Standart Dosya Planı (SDP) hiyerarşisini oluşturmak için yeni bir plan ekleyin.
        </p>
        <CreateFilePlanDialog onPlanCreated={handlePlanCreated} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Plan Seçici Sekmeleri ve Yönetim Butonları */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
            <FolderTree className="size-3.5 text-primary" />
            Planlar:
          </span>
          {plans.map((p) => {
            const isActive = p.id === activePlanId;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setActivePlanId(p.id);
                  setSelectedId(null);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border bg-background text-foreground hover:bg-muted"
                )}
              >
                <span className="font-mono text-[11px]">{p.code}</span>
                <span className="truncate max-w-[200px]">{p.name}</span>
                <span className="text-[10px] opacity-75">({p.version})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCsv}
            className="text-xs h-8.5 gap-1.5"
            title="Standart Dosya Planını Excel/CSV Olarak İndir"
          >
            <FileDown className="size-3.5" />
            <span className="hidden sm:inline">Dışa Aktar (CSV)</span>
          </Button>

          <CreateFilePlanDialog onPlanCreated={handlePlanCreated} />

          {activePlan ? (
            <DeleteFilePlanDialog
              planId={activePlan.id}
              planCode={activePlan.code}
              planName={activePlan.name}
              onPlanDeleted={handlePlanDeleted}
            />
          ) : null}
        </div>
      </div>

      {/* 2. Aktif Plan Meta Bilgi Şeridi */}
      {activePlan ? (
        <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4 shadow-xs">
          <div className="bg-card p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Yürürlük Makamı
            </dt>
            <dd className="mt-1 text-xs font-semibold text-foreground truncate">
              {activePlan.authority}
            </dd>
          </div>
          <div className="bg-card p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Sürüm & Durum
            </dt>
            <dd className="mt-1 text-xs font-semibold text-foreground flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                {activePlan.version}
              </Badge>
              {activePlan.isActive ? (
                <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                  ● Aktif Yürürlükte
                </span>
              ) : (
                <span className="text-muted-foreground text-[11px]">Pasif / Arşiv</span>
              )}
            </dd>
          </div>
          <div className="bg-card p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Yürürlük Tarihi
            </dt>
            <dd className="mt-1 text-xs font-semibold text-foreground">
              {activePlan.effectiveFrom} {activePlan.effectiveTo ? ` - ${activePlan.effectiveTo}` : ""}
            </dd>
          </div>
          <div className="bg-card p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Toplam Tasnif Düğümü
            </dt>
            <dd className="mt-1 text-xs font-bold text-primary">
              {nodes.length} Düğüm Kayıtlı
            </dd>
          </div>
        </dl>
      ) : null}

      {/* 3. Arama, Seviye Kontrolleri ve "Tümünü Aç / Kapat" Çubuğu */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-3 shadow-xs">
        {/* Sol: Arama Kutusu ve Eşleşme Sayacı */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tasnif kodu veya başlık filtrele (Örn: 805, imar, meclis)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8.5 w-full rounded-lg border border-border bg-background pl-8.5 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Aramayı Temizle"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {searchQuery && (
            <span className="text-[11px] font-bold text-primary bg-primary/10 rounded px-2 py-1 whitespace-nowrap">
              {matchedCount} eşleşme
            </span>
          )}
        </div>

        {/* Sağ: Kullanıcı Dostu Hızlı Seviye & Genişlet/Daralt Kontrolleri */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Hızlı Seviye Seçicileri */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              onClick={() => expandLevel(1)}
              className="rounded px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-background transition-all"
              title="Sadece Ana Grupları Göster (Seviye 1)"
            >
              Ana Gruplar
            </button>
            <button
              onClick={() => expandLevel(2)}
              className="rounded px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-background transition-all"
              title="Alt Gruplara Kadar Aç (Seviye 2)"
            >
              Alt Gruplar
            </button>
          </div>

          {/* Tümünü Aç / Tümünü Kapat Butonları */}
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="text-xs h-8.5 gap-1.5"
            title="Tüm Tasnif Ağacını Aç"
          >
            <ChevronsUpDown className="size-3.5 text-primary" />
            <span>Tümünü Genişlet</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
            className="text-xs h-8.5 gap-1.5"
            title="Tüm Tasnif Ağacını Kapat"
          >
            <ChevronsDownUp className="size-3.5 text-muted-foreground" />
            <span>Tümünü Daralt</span>
          </Button>

          {activePlan ? (
            <AddFilePlanNodeDialog
              planId={activePlan.id}
              nodes={nodes}
              onNodeAdded={handleNodeAdded}
              triggerLabel="Yeni Konu Kodu Ekle"
              buttonSize="sm"
            />
          ) : null}
        </div>
      </div>

      {/* 4. İki Sütunlu Tasnif Ağacı ve Düğüm Detay Paneli */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Sol Sütun: İnteraktif Tasnif Ağacı */}
        <div className="rounded-xl border border-border bg-card p-3 shadow-xs overflow-x-auto min-h-[460px]">
          {roots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <FolderTree className="size-8 opacity-40" />
              <p className="font-semibold text-foreground">
                {searchQuery ? "Aramaya uygun tasnif düğümü bulunamadı." : "Bu dosya planında henüz konu kodu tanımlanmamış."}
              </p>
              {searchQuery ? (
                <Button variant="outline" size="sm" onClick={() => setSearchQuery("")} className="mt-2 text-xs">
                  Aramayı Sıfırla
                </Button>
              ) : activePlan ? (
                <AddFilePlanNodeDialog
                  planId={activePlan.id}
                  nodes={nodes}
                  onNodeAdded={handleNodeAdded}
                  triggerLabel="İlk Konu Kodunu Ekle"
                  buttonSize="sm"
                />
              ) : null}
            </div>
          ) : (
            <ul role="tree" aria-label="Tasnif ağacı" className="flex flex-col gap-0.5">
              {roots.map((node) => (
                <TreeItem
                  key={node.id}
                  planId={activePlanId}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  onToggle={toggle}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  allNodes={nodes}
                  onNodeAdded={handleNodeAdded}
                  onNodeDeleted={handleNodeDeleted}
                  searchQuery={searchQuery}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Sağ Sütun: Seçili Düğüm Ayrıntısı, Ekmek Kırıntısı Yolu ve Dizi Pusulası */}
        <aside className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <FileText className="size-4 text-primary" />
              Tasnif Kodu Ayrıntısı
            </h3>
            {selected ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyCode(selected.code)}
                  className="size-7 text-muted-foreground hover:text-foreground"
                  title="Kodu Kopyala"
                >
                  {copiedCode ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                </Button>
                <Badge variant="outline" className="font-mono text-[10px]">
                  Seviye {selected.level}
                </Badge>
              </div>
            ) : null}
          </div>

          {selected && activePlan ? (
            <div className="flex flex-col gap-4">
              {/* Ekmek Kırıntısı (Breadcrumb) Hiyerarşi Yolu */}
              <div className="rounded-lg border border-border bg-muted/25 p-2.5 flex flex-col gap-1 text-[11px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Hiyerarşik Tasnif Yolu:
                </span>
                <div className="flex flex-wrap items-center gap-1 text-muted-foreground font-mono">
                  {breadcrumbs.map((b, idx) => (
                    <span key={b.id} className="flex items-center gap-1">
                      {idx > 0 && <span className="text-border">/</span>}
                      <span
                        className={cn(
                          "truncate max-w-[140px]",
                          b.id === selected.id ? "font-bold text-primary" : "hover:text-foreground cursor-pointer"
                        )}
                        onClick={() => setSelectedId(b.id)}
                        title={`${b.code} - ${b.title}`}
                      >
                        {b.code}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <dl className="flex flex-col gap-2.5 text-xs">
                <div className="flex items-baseline justify-between gap-2 border-b border-border pb-2">
                  <dt className="text-muted-foreground uppercase font-bold text-[10px]">Tasnif Kodu</dt>
                  <dd className="font-mono font-bold text-primary text-sm flex items-center gap-1">
                    {selected.code}
                  </dd>
                </div>
                <div className="flex flex-col gap-1 border-b border-border pb-2">
                  <dt className="text-muted-foreground uppercase font-bold text-[10px]">Konu Başlığı</dt>
                  <dd className="font-semibold text-foreground text-xs leading-relaxed">{selected.title}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-2 border-b border-border pb-2">
                  <dt className="text-muted-foreground uppercase font-bold text-[10px]">Dosya Açılabilir</dt>
                  <dd className="font-bold text-foreground">
                    {selected.isSelectable ? (
                      <span className="text-emerald-600 dark:text-emerald-400">✓ Evet (Yaprak Düğüm)</span>
                    ) : (
                      <span className="text-muted-foreground">✕ Hayır (Üst Grup)</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-2 border-b border-border pb-2">
                  <dt className="text-muted-foreground uppercase font-bold text-[10px]">Durum</dt>
                  <dd className="font-bold text-foreground">
                    {selected.isActive ? "Aktif Yürürlükte" : "Pasif"}
                  </dd>
                </div>
              </dl>

              {/* Düğüm Eylem Butonları */}
              <div className="flex flex-col gap-2 pt-1 border-t border-border">
                <AddFilePlanNodeDialog
                  planId={activePlan.id}
                  nodes={nodes}
                  defaultParentId={selected.id}
                  onNodeAdded={handleNodeAdded}
                  triggerLabel={`'${selected.code}' Altına Yeni Kod Ekle`}
                  buttonSize="sm"
                  variant="outline"
                />

                <DeleteNodeDialog
                  planId={activePlan.id}
                  node={selected}
                  allNodes={nodes}
                  onNodeDeleted={handleNodeDeleted}
                  buttonVariant="outline"
                  buttonSize="sm"
                />
              </div>

              {/* İlgili Dizi Pusulası Önizleme */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileSpreadsheet className="size-3.5 text-primary" />
                    Dizi Pusulası Kayıtları
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">0 Evrak</span>
                </div>

                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground text-[11px]">Bağlı Dizi Pusulası Yok</p>
                  <p className="text-[10px] mt-0.5">Bu tasnif koduna ({selected.code}) henüz arşiv evrakı taranmamış veya indekslenmemiş.</p>
                  <Link href="/tarama" className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                    Evrak Tara ve Ekle →
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground">
              <FolderTree className="size-8 opacity-40 mb-2" />
              <p className="font-medium text-foreground">Düğüm Seçilmedi</p>
              <p className="mt-1 text-[11px]">
                Ayrıntıları görmek, hiyerarşik yolu incelemek, alt kod eklemek veya kodu silmek için ağaçtan bir düğüm seçin.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/60 font-bold px-0.5 rounded text-slate-900 dark:text-yellow-100">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function TreeItem({
  planId,
  node,
  depth,
  expanded,
  onToggle,
  selectedId,
  onSelect,
  allNodes,
  onNodeAdded,
  onNodeDeleted,
  searchQuery,
}: {
  planId: string;
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  allNodes: FilePlanNode[];
  onNodeAdded: (newNode: FilePlanNode) => void;
  onNodeDeleted: (deletedIds: string[]) => void;
  searchQuery: string;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const Icon = node.isSelectable ? FileText : isExpanded ? FolderOpen : Folder;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
      <div
        className={cn(
          "group relative flex min-h-9 items-center gap-1.5 rounded-lg pr-2 text-xs transition-colors",
          isSelected
            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
            : "text-foreground hover:bg-muted"
        )}
        style={{ paddingLeft: `${depth * 1.25 + 0.25}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-label={isExpanded ? `${node.code} daralt` : `${node.code} genişlet`}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="size-3.5" aria-hidden />
            ) : (
              <ChevronRight className="size-3.5" aria-hidden />
            )}
          </button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden />
        )}

        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left focus-visible:outline-none"
        >
          <Icon
            className={cn(
              "size-3.5 shrink-0",
              isSelected
                ? "text-primary-foreground"
                : node.isSelectable
                ? "text-primary"
                : "text-amber-500"
            )}
            aria-hidden
          />
          <span className="font-mono text-xs font-bold shrink-0">
            {highlightMatch(node.code, searchQuery)}
          </span>
          <span className="truncate">
            {highlightMatch(node.title, searchQuery)}
          </span>
        </button>

        {/* Satır Üzerine Gelince Görünen Hızlı Eylemler */}
        <div
          className={cn(
            "ml-auto items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
            isSelected ? "flex opacity-100" : "hidden sm:flex"
          )}
        >
          <AddFilePlanNodeDialog
            planId={planId}
            nodes={allNodes}
            defaultParentId={node.id}
            onNodeAdded={onNodeAdded}
            buttonSize="icon"
            variant="ghost"
          />

          <DeleteNodeDialog
            planId={planId}
            node={node}
            allNodes={allNodes}
            onNodeDeleted={onNodeDeleted}
            buttonVariant="ghost"
            buttonSize="icon"
          />
        </div>
      </div>

      {hasChildren && isExpanded ? (
        <ul role="group" className="flex flex-col gap-0.5 mt-0.5">
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              planId={planId}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
              allNodes={allNodes}
              onNodeAdded={onNodeAdded}
              onNodeDeleted={onNodeDeleted}
              searchQuery={searchQuery}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function buildTree(nodes: FilePlanNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>(
    nodes.map((node) => [node.id, { ...node, children: [] }])
  );
  const roots: TreeNode[] = [];

  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }

  const sort = (list: TreeNode[]) => {
    list.sort((a, b) => a.code.localeCompare(b.code, "tr"));
    list.forEach((node) => sort(node.children));
  };
  sort(roots);

  return roots;
}
