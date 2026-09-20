import { Map as MapIcon } from "lucide-react";
import { Notice, PageHeader } from "@/components/ui/page";
import {
  getGeoEntities,
  getGeoEntity,
  getGeoMapSettings,
} from "@/features/geo/api/get-geo";
import { MapExplorer } from "@/features/geo/components/map-explorer";
import type { GeoMapFeature } from "@/features/geo/components/geo-map";
import { getWmsMapLayers } from "@/features/geo/api/get-geo-wms";

export const metadata = { title: "Haritada Ara" };

export default async function HaritaPage() {
  const [settings, { items, error }, wmsLayers] = await Promise.all([
    getGeoMapSettings(),
    getGeoEntities(),
    getWmsMapLayers(),
  ]);

  // Geometriler ayrı uçtan gelir; liste yanıtı yalnız sınırlayıcı kutu taşır.
  const geometries: GeoMapFeature[] = (
    await Promise.all(items.map((entity) => getGeoEntity(entity.id)))
  )
    .filter((entity) => entity !== null)
    .map((entity) => ({
      id: entity.id,
      name: entity.name,
      entityType: entity.entityType,
      geoJson: entity.geoJson,
    }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Haritada Ara"
        description="Kurumsal kayıtları yol, mahalle, parsel gibi gerçek coğrafi nesneler üzerinden bulun."
      />

      <Notice icon={MapIcon}>
        Belgeler yalnız enlem/boylam ile değil, haritadaki kurumsal nesnenin
        kendisiyle ilişkilendirilir. Bir nesneyi seçtiğinizde ona bağlı tüm
        kararlar, projeler ve tutanaklar listelenir.
      </Notice>

      {error || !settings ? (
        <div className="rounded-lg border border-destructive/40 bg-card p-6 text-center">
          <p className="text-sm font-medium">Harita verisi alınamadı</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error ?? "CBS ayarları okunamadı."}
          </p>
        </div>
      ) : (
        <MapExplorer
          settings={settings}
          entities={items}
          geometries={geometries}
          wmsLayers={wmsLayers}
        />
      )}
    </div>
  );
}
