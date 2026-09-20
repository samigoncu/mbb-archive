import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Notice, PageHeader, Panel } from "@/components/ui/page";
import { apiGet } from "@/lib/api/api-client";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { getGeoMapSettings } from "@/features/geo/api/get-geo";
import { loadGeoConfigurationAction } from "@/features/geo/api/geo-admin-actions";
import { GeoSettingsPanel } from "@/features/settings/components/geo-settings-panel";
import { WfsConnectionTest } from "@/features/settings/components/wfs-connection-test";
import { WfsSetupGuide } from "@/features/settings/components/wfs-setup-guide";

export const metadata = { title: "CBS Servisleri" };

export default async function Page() {
  const [settings, user, layers] = await Promise.all([
    getGeoMapSettings(),
    getCurrentUser(),
    apiGet<{ provider: string; layerName: string; title: string }[]>("/geo/layers", { cache: "no-store" }).catch(() => null),
  ]);

  const allowed = (permission: string) =>
    !!user && (user.isBootstrapAdministrator || user.permissions.includes(permission));
  const canManage = allowed("geo.manage");
  const geo = canManage ? (await loadGeoConfigurationAction()).data ?? null : null;
  const wfsLayers = layers?.filter(layer => layer.provider === "wfs");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="CBS Servisleri"
        description="Kurumun WFS ve WMS servislerini, yayımlanan katmanları ve harita altlığını tanımlayın. Değişiklik yeniden başlatma gerektirmez."
        actions={
          allowed("geo.read") ? (
            <Link href="/harita" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              Kurum haritasını aç
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          ) : undefined
        }
      />

      <dl className="grid gap-3 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">WFS servisi</dt>
          <dd className="mt-1 font-medium">
            {!settings ? "Durum alınamadı" : settings.isProviderConfigured ? "Tanımlı · bağlantı testi yapılabilir" : "Henüz tanımlanmadı"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Harita altlığı</dt>
          <dd className="mt-1 font-medium">
            {!settings ? "Durum alınamadı" : settings.isBasemapConfigured ? "Tanımlı" : "Henüz tanımlanmadı"}
          </dd>
        </div>
      </dl>

      {canManage ? (
        <GeoSettingsPanel initial={geo} canManage />
      ) : (
        <Notice>CBS servislerini yalnız `geo.manage` yetkisi olan kullanıcı düzenleyebilir.</Notice>
      )}

      {layers === null && <Notice>Katman bilgisi alınamadı. Bağlantıyı ve erişim yetkinizi kontrol edin.</Notice>}

      <Panel title="Bağlantı testi ve kurulum" description="Tanımlı katmanları sorgulayın, sunucu kurulumunu kontrol edin." padded>
        <div className="space-y-5">
          <WfsConnectionTest layers={wfsLayers ?? []} />
          <WfsSetupGuide />
        </div>
      </Panel>
    </div>
  );
}
