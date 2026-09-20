"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Clock,
  FileSearch,
  FileStack,
  FileText,
  FolderOpen,
  HandCoins,
  Layers,
  MapPin,
  PieChart,
  Library,
  type LucideIcon,
  Trash2,
} from "lucide-react";
import type { DashboardSummary } from "@/features/dashboard/api/get-dashboard-summary";
import { folderStatusLabels } from "@/features/physical-archive/model/folder";

/**
 * Binlik ayracı elle uygulanır; `toLocaleString` sunucu ile tarayıcıda farklı
 * ICU verisiyle çalışıp hydration uyuşmazlığı üretebilir.
 */
function formatCount(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Ölçüm gelmediyse uydurma değer değil, "—" gösterilir. */
function formatMeasurement(value: number | null): string {
  return value === null ? "—" : formatCount(value);
}

const statusColors: Record<string, string> = {
  Available: "#10b981",
  OnLoan: "#f59e0b",
  Transferred: "#0284c7",
  Disposed: "#e11d48",
};

const statusHrefs: Record<string, string> = {
  Available: "/dosya-islemleri",
  OnLoan: "/odunc",
  Transferred: "/devir-imha",
  Disposed: "/devir-imha",
};

export function ExecutiveDashboardView({
  summary,
}: {
  summary: DashboardSummary;
}) {
  const { documents, folders, loans, locations, operations } = summary;
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);

  // Yerleşim doluluğu: konuma doğrudan yerleştirilmiş klasör sayıları (kesin veri).
  const barData = useMemo(() => {
    const colors = [
      "#6366f1", "#4f46e5", "#0ea5e9", "#0284c7", "#3b82f6",
      "#8b5cf6", "#6d28d9", "#06b6d4", "#10b981", "#f59e0b",
    ];

    return locations.items
      .filter((location) => location.folderCount > 0)
      .sort((a, b) => b.folderCount - a.folderCount)
      .slice(0, 10)
      .map((location, i) => ({
        // Raf/dolap adları konumlar arasında tekrar eder; benzersiz olan koddur.
        label: location.code,
        name: location.name,
        code: location.code,
        count: location.folderCount,
        capacity: location.capacity,
        color: colors[i % colors.length],
      }));
  }, [locations.items]);

  // Dosya durum dağılımı: her dilim filtrelenmiş kesin toplamdan gelir.
  const donutData = useMemo(() => {
    const entries = [
      { status: "Available", count: folders.available },
      { status: "OnLoan", count: folders.onLoan },
      { status: "Transferred", count: folders.transferred },
      { status: "Disposed", count: folders.disposed },
    ].filter((entry) => entry.count > 0);

    const total = entries.reduce((sum, entry) => sum + entry.count, 0) || 1;

    return entries.map((entry) => ({
      ...entry,
      label: folderStatusLabels[entry.status as keyof typeof folderStatusLabels],
      percent: Math.round((entry.count / total) * 100),
      color: statusColors[entry.status],
      href: statusHrefs[entry.status],
    }));
  }, [folders.available, folders.onLoan, folders.transferred, folders.disposed]);

  const occupancyPercent =
    locations.capacity > 0
      ? Math.round((locations.used / locations.capacity) * 100)
      : null;

  return (
    <div className="flex flex-col gap-5">
      {/* 1. DÖRT BÜYÜK İSTATİSTİK KARTI — tamamı ilgili modüle gider */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          href="/documents"
          background="#f97316"
          title="BUGÜN YÜKLENEN BELGE"
          icon={FileText}
          tone="text-orange-100"
          value={`${formatCount(documents.today.count)}${documents.today.isPartial ? "+" : ""}`}
          footer={[
            {
              label: "Son 7 Gün",
              value: `${formatCount(documents.lastSevenDays.count)}${documents.lastSevenDays.isPartial ? "+" : ""}`,
            },
            { label: "Toplam Belge", value: formatCount(documents.total) },
          ]}
        />

        <StatCard
          href="/dosya-islemleri"
          background="#10b981"
          title="TOPLAM ARŞİV DOSYASI"
          icon={FolderOpen}
          tone="text-emerald-100"
          value={formatCount(folders.total)}
          footer={[
            { label: "Rafta", value: formatCount(folders.available) },
            { label: "Ödünçte", value: formatCount(folders.onLoan) },
          ]}
        />

        <StatCard
          href="/arama"
          background="#0284c7"
          title="İNDEKSLENEN BELGE"
          icon={FileSearch}
          tone="text-sky-100"
          value={formatMeasurement(documents.indexed)}
          footer={[
            { label: "Toplam Belge", value: formatCount(documents.total) },
            { label: "Kuyrukta", value: formatMeasurement(documents.indexPending) },
          ]}
        />

        <StatCard
          href="/arsiv-yerlesimi"
          background="#dc2626"
          title="RAF KAPASİTESİ"
          icon={Library}
          tone="text-red-100"
          value={locations.capacity > 0 ? formatCount(locations.capacity) : "—"}
          footer={[
            { label: "Dolu", value: formatCount(locations.used) },
            {
              label: "Doluluk",
              value: occupancyPercent === null ? "—" : `%${occupancyPercent}`,
            },
          ]}
        />
      </div>

      {/* 2. İKİNCİL KUTUCUKLAR — hepsi tıklanabilir */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniStat
          href="/odunc"
          icon={HandCoins}
          label="Zimmetteki Dosya"
          value={formatCount(loans.active)}
        />
        <MiniStat
          href="/odunc"
          icon={Clock}
          label="Gecikmiş İade"
          value={formatCount(loans.overdue)}
          alert={loans.overdue > 0}
        />
        <MiniStat
          href="/devir-imha"
          icon={Layers}
          label="Devredilen Dosya"
          value={formatCount(folders.transferred)}
        />
        <MiniStat
          href="/devir-imha"
          icon={Trash2}
          label="İmha Edilen"
          value={formatCount(folders.disposed)}
        />
        <MiniStat
          href="/arsiv-yerlesimi"
          icon={MapPin}
          label="Yerleşim Birimi"
          value={formatCount(locations.count)}
        />
        <MiniStat
          href="/operations"
          icon={FileStack}
          label="İşlem Kuyruğu"
          value={formatMeasurement(operations?.processingActive ?? null)}
          alert={(operations?.processingFailed ?? 0) > 0}
        />
      </div>

      {/* 3. ÇİFT GRAFİK BÖLÜMÜ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* SOL: YERLEŞİM BAZLI DOSYA DAĞILIMI */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">YERLEŞİM BAZLI DOSYA DAĞILIMI</h3>
            </div>
            <span className="text-xs text-muted-foreground">En yoğun 10 konum</span>
          </div>

          {barData.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Henüz bir konuma yerleştirilmiş arşiv dosyası bulunmamaktadır.
            </div>
          ) : (
            <div className="relative my-4 flex h-60 items-end gap-2 sm:gap-3 px-2 pt-6">
              {barData.map((bar, i) => {
                const maxCount = Math.max(...barData.map((b) => b.count), 1);
                const heightPercent = Math.max(8, (bar.count / maxCount) * 100);
                const isHovered = hoveredBar === i;

                return (
                  <Link
                    key={bar.code}
                    href="/arsiv-yerlesimi"
                    onMouseEnter={() => setHoveredBar(i)}
                    onMouseLeave={() => setHoveredBar(null)}
                    aria-label={`${bar.code} konumunda ${bar.count} dosya — arşiv yerleşimini aç`}
                    className="group relative flex flex-1 flex-col items-center justify-end h-full rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isHovered && (
                      <div className="absolute -top-10 z-20 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-lg whitespace-nowrap">
                        {bar.name ? `${bar.name} · ` : ""}{bar.code}: {formatCount(bar.count)} dosya
                        {bar.capacity ? ` / ${formatCount(bar.capacity)} kapasite` : ""}
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
                  </Link>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Sistemde toplam <strong>{formatCount(folders.total)}</strong> arşiv dosyası,
              bunların <strong>{formatCount(folders.placed)}</strong> tanesi bir konuma yerleştirilmiş.
            </span>
            <Link href="/dosya-islemleri" className="font-bold text-primary hover:underline">
              Tümünü Gör →
            </Link>
          </div>
        </div>

        {/* SAĞ: DOSYA DURUM DAĞILIMI */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">DOSYA DURUM DAĞILIMI</h3>
            </div>
            <span className="text-xs text-muted-foreground">Kesin toplamlar</span>
          </div>

          {donutData.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Henüz durum dağılımı oluşturacak arşiv dosyası bulunmamaktadır.
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
                      acc.elements.push(
                        <circle
                          key={slice.status}
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="transparent"
                          stroke={slice.color}
                          strokeWidth={hoveredSlice === idx ? "4.6" : "3.8"}
                          strokeDasharray={`${slice.percent} ${100 - slice.percent}`}
                          strokeDashoffset={-acc.offset}
                          className="transition-all duration-300"
                        />
                      );
                      acc.offset += slice.percent;
                      return acc;
                    },
                    { elements: [] as React.ReactNode[], offset: 0 }
                  ).elements}
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold text-muted-foreground">Dosya</span>
                  <span className="text-xl font-black text-foreground">
                    {formatCount(folders.total)}
                  </span>
                  <span className="text-[9px] text-muted-foreground">Toplam</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full text-xs">
                {donutData.map((slice, idx) => (
                  <Link
                    key={slice.status}
                    href={slice.href}
                    onMouseEnter={() => setHoveredSlice(idx)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    className="flex items-center gap-1.5 truncate rounded px-1 py-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                    <span className="truncate text-muted-foreground text-[11px]">{slice.label}</span>
                    <span className="font-bold text-foreground text-[11px] ml-auto">
                      {formatCount(slice.count)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-border text-center text-[11px] text-muted-foreground">
            {locations.count > 0 ? (
              <>
                <strong>{formatCount(locations.count)}</strong> yerleşim birimi tanımlı.
              </>
            ) : (
              "Henüz yerleşim birimi tanımlanmamış."
            )}
          </div>
        </div>
      </div>

      {/* 4. SON KAYITLAR — her satır kendi kaydına gider */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RecentPanel
          icon={FileText}
          title="SON EKLENEN BELGELER"
          href="/documents"
          emptyLabel="Henüz belge kaydı bulunmamaktadır."
          rows={documents.recent.map((document) => ({
            key: document.id,
            href: `/documents/${document.id}`,
            title: document.title,
            meta: `${document.status} · ${formatCount(document.versionCount)} versiyon`,
            date: document.createdAt,
          }))}
        />

        <RecentPanel
          icon={FolderOpen}
          title="SON EKLENEN ARŞİV DOSYALARI"
          href="/dosya-islemleri"
          emptyLabel="Henüz arşiv dosyası bulunmamaktadır."
          rows={folders.recent.map((folder) => ({
            key: folder.id,
            href: "/dosya-islemleri",
            title: folder.title,
            meta: `${folder.barcode} · ${folder.locationName || "konumsuz"} · ${
              folderStatusLabels[folder.status]
            }`,
            date: folder.createdAt,
          }))}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  href,
  background,
  title,
  tone,
  value,
  footer,
}: {
  href: string;
  icon: LucideIcon;
  background: string;
  title: string;
  tone: string;
  value: string;
  footer: Array<{ label: string; value: string }>;
}) {
  return (
    <Link
      href={href}
      style={{ backgroundColor: background }}
      className="group relative overflow-hidden rounded-xl p-4 text-white shadow-md flex flex-col justify-between min-h-[140px] transition-all hover:brightness-110 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <Icon className="pointer-events-none absolute right-4 top-1/2 size-24 -translate-y-1/2 -rotate-12 text-white opacity-20" strokeWidth={1.5} aria-hidden="true" />
      <div className="relative z-10 flex items-start justify-between gap-2">
        <span className={`text-[11px] font-black uppercase tracking-wider ${tone}`}>
          {title}
        </span>
        <span className="text-2xl font-black">{value}</span>
      </div>
      <div className={`relative z-10 mt-4 pt-2 border-t border-white/20 flex items-center justify-between text-[10px] font-medium ${tone}`}>
        {footer.map((entry) => (
          <span key={entry.label}>
            {entry.label}: <strong className="text-white font-bold">{entry.value}</strong>
          </span>
        ))}
      </div>
      <ArrowUpRight className="absolute right-3 bottom-9 size-4 opacity-0 transition-opacity group-hover:opacity-80" aria-hidden />
    </Link>
  );
}

function MiniStat({
  href,
  icon: Icon,
  label,
  value,
  alert = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        alert ? "border-destructive/50" : "border-border"
      }`}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
          alert ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[11px] font-medium text-muted-foreground">{label}</span>
        <span className={`text-lg font-black ${alert ? "text-destructive" : "text-foreground"}`}>
          {value}
        </span>
      </span>
    </Link>
  );
}

function RecentPanel({
  icon: Icon,
  title,
  href,
  rows,
  emptyLabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  href: string;
  rows: Array<{ key: string; href: string; title: string; meta: string; date: string }>;
  emptyLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
        </div>
        <Link href={href} className="text-xs font-bold text-primary hover:underline">
          Tümünü Gör →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {rows.map((row) => (
            <li key={row.key}>
              <Link
                href={row.href}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-foreground">{row.title}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{row.meta}</span>
                </span>
                <time
                  dateTime={row.date}
                  className="shrink-0 text-[11px] font-medium text-muted-foreground"
                >
                  {row.date.slice(0, 10)}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
