import Link from "next/link";
import { Archive, Boxes, Layers, Percent } from "lucide-react";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import { getLocationOccupancy } from "@/features/physical-archive/api/get-occupancy";
import { OccupancyTree } from "@/features/physical-archive/components/occupancy-tree";
import { PageHeader } from "@/components/ui/page";

export const metadata = { title: "Arşiv Yerleşimi · MBB Kurumsal Arşiv" };

export default async function ArsivYerlesimiPage() {
  const locations = await getLocationOccupancy();

  const withCapacity = locations.filter((item) => item.capacity !== null);
  const totalCapacity = withCapacity.reduce(
    (sum, item) => sum + (item.capacity ?? 0),
    0,
  );
  const totalFolders = locations.reduce((sum, item) => sum + item.folderCount, 0);
  const occupancy =
    totalCapacity > 0 ? Math.round((totalFolders / totalCapacity) * 100) : null;
  const nearFull = withCapacity.filter(
    (item) => item.capacity! > 0 && item.folderCount / item.capacity! >= 0.9,
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Arşiv Yerleşimi"
        description="Depo hiyerarşisi, raf kapasiteleri ve doluluk oranları."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-sky-600 p-2.5 text-white">
            <Boxes className="size-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Görsel 2D/3D Arşiv Simülatörü & Raylı Dolap Modelleme
            </h3>
            <p className="text-xs text-muted-foreground">
              Kompakt raylı dolapları hareket ettirin, dikey rafları ve Haritada Gör (CBS) mekansal kadastro eşleşmesini inceleyin.
            </p>
          </div>
        </div>
        <Link
          href="/arsiv-simulatoru"
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
        >
          <span>Simülatörü Başlat →</span>
        </Link>
      </div>

      <section aria-label="Kapasite özeti" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Yerleşim Birimi"
          value={locations.length}
          hint="Depo, oda, dolap, raf"
          icon={Archive}
        />
        <StatTile
          label="Kapasiteli Birim"
          value={withCapacity.length}
          hint="Kapasitesi tanımlı raf"
          icon={Layers}
        />
        <StatTile
          label="Doluluk"
          value={occupancy}
          hint={`${totalFolders} / ${totalCapacity} dosya`}
          icon={Percent}
          tone={occupancy !== null && occupancy >= 85 ? "warning" : "neutral"}
        />
        <StatTile
          label="Dolmak Üzere"
          value={nearFull}
          hint="%90 üzeri raf"
          icon={Boxes}
          tone={nearFull > 0 ? "danger" : "neutral"}
        />
      </section>

      <OccupancyTree locations={locations} />

      <p className="text-xs text-muted-foreground">
        Doluluk, bir konuma doğrudan yerleştirilmiş dosya sayısının kapasiteye
        oranıdır; üst düğümlerde alt birimlerin toplamı gösterilir. Barkod/QR
        etiket üretimi ve termal yazıcıya gönderme henüz yazılmadı.
      </p>
    </div>
  );
}
