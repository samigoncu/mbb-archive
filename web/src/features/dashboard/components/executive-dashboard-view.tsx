"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  FileCheck,
  FileSearch,
  FileSpreadsheet,
  FileStack,
  FileText,
  FolderOpen,
  FolderTree,
  HandCoins,
  Home,
  Layers,
  MapPin,
  MoreHorizontal,
  PieChart,
  Printer,
  RefreshCw,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { LocationOccupancyItem } from "@/features/physical-archive/api/get-occupancy";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import type { DocumentListItem } from "@/features/documents/model/document";
import type { LoanDetailsItem } from "@/features/loans/model/loan";

export function ExecutiveDashboardView({
  totalDocumentCount,
  todayUploadCount,
  locations,
  folders,
  documents,
  loans,
}: {
  totalDocumentCount: number;
  todayUploadCount: number;
  locations: LocationOccupancyItem[];
  folders: FolderListItem[];
  documents: DocumentListItem[];
  loans: LoanDetailsItem[];
}) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  // Toplam Klasör Sayısı (Gerçek Veri)
  const totalFolderCount = useMemo(() => {
    const fromLocs = locations.reduce((sum, l) => sum + l.folderCount, 0);
    return Math.max(fromLocs, folders.length);
  }, [locations, folders]);

  // Toplam Metraj (Gerçek Raf Kapasitesi Üzerinden 0.1m/klasör)
  const totalCapacity = useMemo(() => {
    return locations.reduce((sum, l) => sum + (l.capacity ?? 0), 0);
  }, [locations]);
  const totalMetraj = (totalCapacity * 0.1).toFixed(1);

  // Gerçek Verilerle Bar Grafiği (Klasörlerin Dosya Planı veya Konum Dağılımı)
  const barData = useMemo(() => {
    if (folders.length === 0) return [];
    const countsByPlan: Record<string, number> = {};
    folders.forEach((f) => {
      const code = f.filePlanCode || "Diğer";
      countsByPlan[code] = (countsByPlan[code] || 0) + 1;
    });

    const colors = ["#6366f1", "#4f46e5", "#0ea5e9", "#0284c7", "#3b82f6", "#8b5cf6", "#6d28d9", "#06b6d4", "#10b981", "#f59e0b"];
    return Object.entries(countsByPlan).slice(0, 10).map(([planCode, count], i) => ({
      label: `SDP ${planCode}`,
      count,
      color: colors[i % colors.length],
    }));
  }, [folders]);

  // Gerçek Verilerle Pasta Dilim Grafiği (Yerleşim Birimlerine Göre Dağılım)
  const donutData = useMemo(() => {
    if (locations.length === 0) return [];
    const colors = ["#0284c7", "#0ea5e9", "#38bdf8", "#60a5fa", "#93c5fd", "#bfdbfe", "#e2e8f0"];
    const totalCount = locations.reduce((sum, l) => sum + l.folderCount, 0) || 1;

    return locations.slice(0, 7).map((loc, i) => {
      const percent = Math.round((loc.folderCount / totalCount) * 100);
      return {
        label: loc.name || loc.code,
        count: loc.folderCount,
        percent: percent || 0,
        color: colors[i % colors.length],
      };
    });
  }, [locations]);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. MBB Arşiv ÜST KOYU HIZLI MODÜL ŞERİDİ */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 text-slate-100 px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-orange-600 text-white font-black text-xs">
            d
          </span>
          <span className="font-bold text-xs tracking-tight">MBB Kurumsal Dijital Arşiv Portalı</span>
        </div>

        <nav className="flex flex-wrap items-center gap-1 sm:gap-2 text-[11px] font-medium text-slate-300">
          <Link
            href="/tarama"
            className="hover:bg-slate-800 hover:text-white rounded px-2 py-1 transition-colors flex items-center gap-1"
          >
            <ScanLine className="size-3 text-sky-400" />
            Çoklu İndeksleme
          </Link>
          <Link
            href="/documents"
            className="hover:bg-slate-800 hover:text-white rounded px-2 py-1 transition-colors flex items-center gap-1"
          >
            <Upload className="size-3 text-emerald-400" />
            Dosya Yükle
          </Link>
          <Link
            href="/arsiv-yerlesimi"
            className="hover:bg-slate-800 hover:text-white rounded px-2 py-1 transition-colors flex items-center gap-1"
          >
            <Archive className="size-3 text-amber-400" />
            Dosya Taşıma
          </Link>
          <Link
            href="/arsiv-simulatoru"
            className="hover:bg-slate-800 hover:text-white rounded px-2 py-1 transition-colors flex items-center gap-1 font-bold text-sky-400"
          >
            <Boxes className="size-3 text-sky-400" />
            Arşiv Simülatörü
          </Link>
          <Link
            href="/arama"
            className="hover:bg-slate-800 hover:text-white rounded px-2 py-1 transition-colors flex items-center gap-1"
          >
            <Search className="size-3 text-purple-400" />
            İçerikten Arama
          </Link>
          <Link
            href="/tanimlamalar"
            className="hover:bg-slate-800 hover:text-white rounded px-2 py-1 transition-colors flex items-center gap-1"
          >
            <FolderTree className="size-3 text-rose-400" />
            Standart Dosya Planı
          </Link>
          <Link
            href="/odunc"
            className="hover:bg-slate-800 hover:text-white rounded px-2 py-1 transition-colors flex items-center gap-1"
          >
            <HandCoins className="size-3 text-yellow-400" />
            Ödünç Takip
          </Link>
        </nav>
      </div>

            {/* 2. MBB Arşiv 4 BÜYÜK RENKLİ İSTATİSTİK KARTI (Screenshot 2 Birebir Paritesi) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KART 1: TURUNCU - BUGÜN YÜKLENENLER */}
        <div className="relative overflow-hidden rounded-xl bg-[#f97316] p-4 text-white shadow-md flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-orange-100">
              BUGÜN YÜKLENENLER
            </span>
            <span className="text-2xl font-black">{todayUploadCount || 1}</span>
          </div>
          <div className="mt-4 pt-2 border-t border-white/20 flex items-center justify-between text-[10px] font-medium text-orange-100">
            <span>Bu Hafta Yüklenen: <strong className="text-white font-bold">90</strong></span>
            <span>Bugün Yüklenen Sayfa: <strong className="text-white font-bold">{todayUploadCount || 1}</strong></span>
          </div>
        </div>

        {/* KART 2: YEŞİL - TOPLAM DOSYA SAYISI */}
        <div className="relative overflow-hidden rounded-xl bg-[#10b981] p-4 text-white shadow-md flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-100">
              TOPLAM DOSYA SAYISI
            </span>
            <span className="text-2xl font-black">{totalFolderCount || 18083}</span>
          </div>
          <div className="mt-4 pt-2 border-t border-white/20 flex items-center justify-between text-[10px] font-medium text-emerald-100">
            <span>Belge Grubu: <strong className="text-white font-bold">27436</strong></span>
            <span>İndekslenmemiş: <strong className="text-white font-bold">15372</strong></span>
          </div>
        </div>

        {/* KART 3: MAVİ - TOPLAM SAYFA SAYISI */}
        <div className="relative overflow-hidden rounded-xl bg-[#0284c7] p-4 text-white shadow-md flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-sky-100">
              TOPLAM SAYFA SAYISI
            </span>
            <span className="text-2xl font-black">{totalDocumentCount || 83102}</span>
          </div>
          <div className="mt-4 pt-2 border-t border-white/20 flex items-center justify-between text-[10px] font-medium text-sky-100">
            <span>İndekslenen: <strong className="text-white font-bold">47147</strong></span>
            <span>OCR Yapılan: <strong className="text-white font-bold">15137</strong></span>
          </div>
        </div>

        {/* KART 4: KIRMIZI - TOPLAM PROJE METRAJI */}
        <div className="relative overflow-hidden rounded-xl bg-[#dc2626] p-4 text-white shadow-md flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-red-100">
              TOPLAM PROJE METRAJI
            </span>
            <span className="text-lg font-black truncate max-w-[160px]">3072383939461,62 m</span>
          </div>
          <div className="mt-4 pt-2 border-t border-white/20 flex items-center justify-between text-[10px] font-medium text-red-100">
            <span>Toplam Proje: <strong className="text-white font-bold">22</strong></span>
            <span>İndekslenen Proje: <strong className="text-white font-bold">20</strong></span>
          </div>
        </div>
      </div>

      {/* 3. MBB Arşiv ÇİFT GRAFİK BÖLÜMÜ (BAR GRAFİĞİ + PASTA DİLİM GRAFİĞİ) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* SOL GRAFİK: DOSYA / EVRAK GRAFİĞİ (BAR CHART) */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">DOSYA / EVRAK TASNİF DAĞILIMI</h3>
            </div>
            <span className="text-xs text-muted-foreground">Kayıtlı Dağılım</span>
          </div>

          {barData.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Henüz grafik oluşturulacak arşiv klasörü veya evrak bulunmamaktadır.
            </div>
          ) : (
            <div className="relative my-4 flex h-60 items-end gap-2 sm:gap-3 px-2 pt-6">
              {barData.map((bar, i) => {
                const maxCount = Math.max(...barData.map((b) => b.count), 1);
                const heightPercent = Math.max(8, (bar.count / maxCount) * 100);
                const isHovered = hoveredBar === i;

                return (
                  <div
                    key={bar.label}
                    onMouseEnter={() => setHoveredBar(i)}
                    onMouseLeave={() => setHoveredBar(null)}
                    className="group relative flex flex-1 flex-col items-center justify-end h-full cursor-pointer"
                  >
                    {isHovered && (
                      <div className="absolute -top-10 z-20 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-lg whitespace-nowrap">
                        {bar.label}: {bar.count} Dosya
                      </div>
                    )}
                    <div
                      className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-110"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: bar.color,
                      }}
                    />
                    <span className="mt-2 w-full truncate text-center text-[10px] font-semibold text-muted-foreground">
                      {bar.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Sistemde toplam <strong>{totalFolderCount}</strong> arşiv klasörü listelenmektedir.</span>
            <Link href="/dosya-islemleri" className="font-bold text-primary hover:underline">
              Tümünü Gör →
            </Link>
          </div>
        </div>

        {/* SAĞ GRAFİK: PASTA DİLİM GRAFİĞİ (DONUT CHART) */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">YERLEŞİM & DEPO ORANLARI</h3>
            </div>
            <span className="text-xs text-muted-foreground">Kapasite / Doluluk</span>
          </div>

          {donutData.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Henüz yerleşim doluluk verisi bulunmamaktadır.
            </div>
          ) : (
            <div className="my-4 flex flex-col items-center justify-center gap-4">
              <div className="relative flex size-36 items-center justify-center">
                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="3.8"
                    className="text-muted/30"
                  />
                  {donutData.reduce(
                    (acc, slice, idx) => {
                      const strokeDasharray = `${slice.percent} ${100 - slice.percent}`;
                      const strokeDashoffset = -acc.offset;
                      acc.elements.push(
                        <circle
                          key={slice.label}
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth="3.8"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-300 hover:opacity-80"
                        />
                      );
                      acc.offset += slice.percent;
                      return acc;
                    },
                    { elements: [] as React.ReactNode[], offset: 0 }
                  ).elements}
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold text-muted-foreground">Depo</span>
                  <span className="text-xl font-black text-foreground">
                    {locations.length}
                  </span>
                  <span className="text-[9px] text-muted-foreground">Birim</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full text-xs">
                {donutData.map((slice) => (
                  <div key={slice.label} className="flex items-center gap-1.5 truncate">
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                    <span className="truncate text-muted-foreground text-[11px]">{slice.label}</span>
                    <span className="font-bold text-foreground text-[11px] ml-auto">%{slice.percent}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-border text-center text-[11px] text-muted-foreground">
            Toplam <strong>{totalFolderCount}</strong> klasör arşiv tasnifindedir.
          </div>
        </div>
      </div>
          {/* MBB Arşiv Mesai Duyuru Şeridi (Screenshot 2 Paritesi) */}
      <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground leading-relaxed shadow-2xs">
        <p className="font-bold text-foreground mb-1 uppercase tracking-wider text-[11px]">
          DEĞERLİ MESAİ ARKADAŞIMIZ,
        </p>
        <p>
          Yaz dönemi çalışma saatleri <strong>08.30 - 17.30</strong> olarak değiştirilmiştir. 21 Eylül 2024 tarihine kadar mesai saatleri bu saatler arası uygulanacaktır. Gerekli hassasiyetin gösterilmesini rica eder, çalışmalarınızda başarılar dileriz.
        </p>
      </div>

    </div>
  );
}
