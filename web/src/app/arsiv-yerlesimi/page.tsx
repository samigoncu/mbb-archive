import Link from "next/link";
import { Archive, Boxes, Layers, Percent } from "lucide-react";
import { StatTile } from "@/features/dashboard/components/stat-tile";
import { getLocationOccupancy } from "@/features/physical-archive/api/get-occupancy";
import { OccupancyTree } from "@/features/physical-archive/components/occupancy-tree";
import { PageHeader } from "@/components/ui/page";
import { NewLocationDialog } from "@/features/physical-archive/components/location-dialogs";
import { getLocationTypes } from "@/features/physical-archive/api/get-location-types";
import { getCurrentUser } from "@/features/access/api/get-current-user";

export const metadata = { title: "Arşiv Yerleşimi" };

export default async function ArsivYerlesimiPage() {
  const [locations, user, types] = await Promise.all([getLocationOccupancy(), getCurrentUser(), getLocationTypes()]);
  const canManage = !!user && (user.isBootstrapAdministrator || user.permissions.includes("physical-archive.manage"));

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
        description="Bina, oda, dolap ve raf hiyerarşisini yönetin; kayıtlı kapasite ve dosya sayılarını inceleyin."
        actions={canManage && locations.length === 0 ? <NewLocationDialog types={types} /> : undefined}
      />

      <nav aria-label="Fiziksel arşiv araçları" className="grid gap-3 sm:grid-cols-2">
        <Link href="/dosya-islemleri" className="rounded-xl border border-border bg-card p-4 hover:bg-muted/40"><span className="text-sm font-semibold">Fiziksel dosyalar →</span><p className="mt-1 text-xs leading-5 text-muted-foreground">Klasörleri bulun, konumlarını kontrol edin ve taşıma işlemlerine erişin.</p></Link>
        <Link href="/arsiv-simulatoru" className="rounded-xl border border-border bg-card p-4 hover:bg-muted/40"><span className="text-sm font-semibold">Görsel arşiv yerleşimi →</span><p className="mt-1 text-xs leading-5 text-muted-foreground">Arşiv yerleşimini simülatörde inceleyin.</p></Link>
        {canManage && <Link href="/tanimlamalar/yerlesim-seviyeleri" className="rounded-xl border border-border bg-card p-4 hover:bg-muted/40 sm:col-span-2"><span className="text-sm font-semibold">Arşiv yerleşim seviyeleri →</span><p className="mt-1 text-xs leading-5 text-muted-foreground">Bina, oda, dolap, raf kalıbını düzenleyin; ihtiyacınız olan seviye yoksa buradan ekleyin.</p></Link>}
      </nav>

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
          hint={totalCapacity ? `${totalFolders} dosya / ${totalCapacity} kapasite` : "Kapasite tanımlanmamış"}
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

      <OccupancyTree locations={locations} types={types} canManage={canManage} />

      <p className="text-xs text-muted-foreground">
        Doluluk, bir konuma doğrudan yerleştirilmiş dosya sayısının kapasiteye
        oranıdır; üst düğümlerde alt birimlerin toplamı gösterilir.
        {canManage ? " Bir konumu silmek yalnız altında konum ve içinde dosya yoksa mümkündür; kullanımdan çıkarmak için pasife alın." : ""}
      </p>
    </div>
  );
}
