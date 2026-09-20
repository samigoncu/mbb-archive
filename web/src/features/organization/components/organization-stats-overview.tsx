import Link from "next/link";
import {
  Building2,
  Users,
  Layers,
  FolderTree,
  Network,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function OrganizationStatsOverview({
  totalUnits,
  activeUnits,
  totalMembers,
  unitTypesCount,
  assignedPlansCount,
  directoryConfigured,
}: {
  totalUnits: number;
  activeUnits: number;
  totalMembers: number;
  unitTypesCount: number;
  assignedPlansCount: number;
  directoryConfigured: boolean;
}) {
  const passiveUnits = totalUnits - activeUnits;

  return (
    <section aria-label="Teşkilat İstatistikleri" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {/* 1. Toplam Teşkilat Birimi */}
      <div className="group relative rounded-xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between transition-all hover:border-primary/40 hover:shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Teşkilat Birimi
            </span>
            <h3 className="text-2xl font-black text-foreground mt-1">
              {totalUnits}
            </h3>
          </div>
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-5" aria-hidden />
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-2">
          <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{activeUnits} aktif</span>
          {passiveUnits > 0 && (
            <span className="text-muted-foreground">· {passiveUnits} pasif</span>
          )}
        </div>
      </div>

      {/* 2. Kayıtlı Personel & Kadro */}
      <div className="group relative rounded-xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between transition-all hover:border-blue-500/40 hover:shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Görevli Personel
            </span>
            <h3 className="text-2xl font-black text-foreground mt-1">
              {totalMembers}
            </h3>
          </div>
          <span className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Users className="size-5" aria-hidden />
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 mt-2">
          <span>Birim kadro atamaları</span>
        </div>
      </div>

      {/* 3. Teşkilat Kademeleri */}
      <div className="group relative rounded-xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between transition-all hover:border-indigo-500/40 hover:shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Teşkilat Kademesi
            </span>
            <h3 className="text-2xl font-black text-foreground mt-1">
              {unitTypesCount}
            </h3>
          </div>
          <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Layers className="size-5" aria-hidden />
          </span>
        </div>
        <Link
          href="/tanimlamalar/birim-seviyeleri"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline mt-2"
        >
          <span>Kademeleri yönet</span>
          <ArrowUpRight className="size-3" />
        </Link>
      </div>

      {/* 4. Standart Dosya Planı (SDP) */}
      <div className="group relative rounded-xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between transition-all hover:border-amber-500/40 hover:shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              SDP Eşleşmesi
            </span>
            <h3 className="text-2xl font-black text-foreground mt-1">
              {assignedPlansCount}
            </h3>
          </div>
          <span className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <FolderTree className="size-5" aria-hidden />
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-2">
          <span>Yetkilendirilmiş konu başlığı</span>
        </div>
      </div>

      {/* 5. Merkezi Dizin (LDAP / AD) */}
      <div className="group relative col-span-2 sm:col-span-1 rounded-xl border border-border/80 bg-card p-4 shadow-xs flex flex-col justify-between transition-all hover:border-cyan-500/40 hover:shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Merkezi Dizin (AD)
            </span>
            <h3 className="text-base font-bold text-foreground mt-1">
              {directoryConfigured ? "Entegre" : "Yerel"}
            </h3>
          </div>
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-lg",
              directoryConfigured
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            <Network className="size-5" aria-hidden />
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground mt-2">
          {directoryConfigured ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3" />
              <span>LDAP senkronizasyonu aktif</span>
            </span>
          ) : (
            <span>Yerel dizin modu</span>
          )}
        </div>
      </div>
    </section>
  );
}

