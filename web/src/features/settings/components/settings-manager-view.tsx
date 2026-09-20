import Link from "next/link";
import { ArrowUpRight, Database, HardDrive, Network, ShieldCheck, ScanLine, Activity, ChevronRight, Palette } from "lucide-react";
import { PageHeader, Panel, Notice } from "@/components/ui/page";
import { getGeoMapSettings } from "@/features/geo/api/get-geo";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { apiGet } from "@/lib/api/api-client";
import { getUploadPolicy } from "../api/upload-policy";
import { UploadPolicyPanel } from "./upload-policy-panel";
import { WfsConnectionTest } from "./wfs-connection-test";
import { WfsSetupGuide } from "./wfs-setup-guide";
import { ProtectionPanel, type ProtectionCapabilities } from "./protection-panel";
import { BrandingPanel } from "./branding-panel";
import { GeoSettingsPanel } from "./geo-settings-panel";
import { loadGeoConfigurationAction } from "@/features/geo/api/geo-admin-actions";
import { getBranding } from "@/features/branding/api/branding";
import { StoragePanel } from "./storage-panel";
import { formatBytes, type StorageStatus } from "../model/storage";

const sectionClass = "min-w-0 scroll-mt-6";
const allowedFor = (user: { isBootstrapAdministrator: boolean; permissions: string[] } | null, permission: string) =>
  !!user && (user.isBootstrapAdministrator || user.permissions.includes(permission));
const linkClass = "inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-sky-300";
export async function SettingsManagerView() {
  const [settings, user, layers, uploadPolicy, branding] = await Promise.all([
    getGeoMapSettings(), getCurrentUser(),
    apiGet<{ provider: string; layerName: string; title: string }[]>("/geo/layers", { cache: "no-store" }).catch(() => null),
    getUploadPolicy().catch(() => null),
    getBranding().catch(() => null),
  ]);
  const geo = allowedFor(user, "geo.manage") ? (await loadGeoConfigurationAction()).data ?? null : null;
  const allowed = (permission: string) => allowedFor(user, permission);
  const protection = allowed("access.admin") ? await apiGet<ProtectionCapabilities>("/documents/protection/capabilities", { cache: "no-store" }).catch(() => null) : null;
  // Depolama durumu salt okunur; yetkisi olmayan yöneticiye hiç gösterilmez.
  const storage = allowed("operations.read")
    ? await apiGet<StorageStatus>("/documents/storage", { cache: "no-store" }).catch(() => null)
    : null;
  const wfsLayers = layers?.filter(layer => layer.provider === "wfs");
  const summary = [
    { icon: Palette, label: "Kurum kimliği", value: branding?.siteTitle ?? "Durum alınamadı", href: "#kurumsal" },
    { icon: HardDrive, label: "Dosya başına yükleme sınırı", value: uploadPolicy ? `${uploadPolicy.maxFileSizeMb} MB` : "Durum alınamadı", href: "#yukleme" },
    { icon: Database, label: "Arşivlenen belge", value: storage ? `${formatBytes(storage.storedBytes)} · ${storage.objectCount.toLocaleString("tr-TR")} nesne` : "Durum alınamadı", href: "#depolama" },
    { icon: ShieldCheck, label: "Kimlik doğrulama", value: !user ? "Durum alınamadı" : user.authenticationMode === "Development" ? "Geliştirme hesabı" : "Kurum oturumu", href: "#oturum" },
  ];
  return <div className="flex flex-col gap-6">
    <PageHeader title="Sistem ayarları" description="Dosya yükleme politikasını, kurum bağlantılarını ve yönetim araçlarını tek yerden yönetin." />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {summary.map(({ icon: Icon, label, value, href }) => <a key={href} href={href} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="rounded-lg bg-muted p-2.5 text-muted-foreground"><Icon className="size-5" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">{label}</span><span className="mt-1 block text-base font-semibold">{value}</span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </a>)}
    </div>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
      <div className="min-w-0 space-y-6">
        <section id="kurumsal" className={sectionClass} aria-label="Kurum kimliği">
          <Panel title="Kurum kimliği" description="Uygulama başlığı, kurum adı, logo, favicon ve giriş ekranı görseli." padded className="rounded-xl">
            <BrandingPanel initial={branding} canManage={allowed("access.admin")} />
          </Panel>
        </section>
        {allowed("access.admin") && <section id="dijital-koruma" className={sectionClass} aria-label="Dijital arşiv koruması"><Panel title="Dijital arşiv koruması" padded><ProtectionPanel capabilities={protection} /></Panel></section>}
        {allowed("operations.read") && <section id="depolama" className={sectionClass} aria-label="Depolama">
          <Panel title="Depolama" description="Arşiv nesnelerinin tutulduğu yer, doluluk ve koruma durumu." padded className="rounded-xl">
            <StoragePanel status={storage} />
          </Panel>
        </section>}
        <section id="yukleme" className={sectionClass} aria-label="Dosya yükleme ve OCR">
          <Panel title="Dosya yükleme ve OCR" description="Tarama ve yeni sürüm yüklemelerinde uygulanan ortak politika." padded className="rounded-xl">
            <UploadPolicyPanel initial={uploadPolicy} canManage={allowed("access.admin")} />
          </Panel>
        </section>
      </div>
      <div className="min-w-0 space-y-6">
        <section id="oturum" className={sectionClass} aria-label="Oturum ve güvenlik">
          <Panel title="Oturum ve güvenlik" description="Etkin kimlik ve erişim yönetimi." padded className="rounded-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-3"><span className="rounded-full bg-muted p-3"><ShieldCheck className="size-5 text-muted-foreground" aria-hidden /></span><div className="min-w-0"><p className="break-words text-sm font-semibold">{user?.subject ?? "Kimlik bilgisi alınamadı"}</p><p className="mt-0.5 text-xs text-muted-foreground">{!user ? "Oturum durumu bilinmiyor" : user.isBootstrapAdministrator ? "Sistem yöneticisi" : "Kurum kullanıcısı"}</p></div></div>
              {user?.authenticationMode === "Development" && <Notice>İşlemler ortak geliştirme hesabıyla kaydediliyor. Kişi bazında denetim için kurum kimlik doğrulaması yapılandırılmalıdır.</Notice>}
              {allowed("access.admin") && <Link href="/tanimlamalar/yetkiler" className={linkClass}>Rolleri ve yetkileri yönet<ArrowUpRight className="size-4" aria-hidden /></Link>}
            </div>
          </Panel>
        </section>
        <section id="tarayici" className={sectionClass} aria-label="Tarayıcı bağlantısı">
          <Panel title="Tarayıcı bağlantısı" description="Belgeleri tarama cihazından doğrudan arşive alın." padded className="rounded-xl">
            <div className="space-y-4"><ScanLine className="size-6 text-muted-foreground" aria-hidden /><p className="text-sm leading-6 text-muted-foreground">eSCL / AirScan destekli cihazlar yerel tarama köprüsüyle bağlanır. Cihaz seçimi ve bağlantı kontrolü tarama ekranından yapılır.</p><Link href="/tarama#ag-tarayicisi" className={linkClass}>Tarama ekranına git<ArrowUpRight className="size-4" aria-hidden /></Link></div>
          </Panel>
        </section>
        <section id="izleme" className={sectionClass} aria-label="İzleme ve denetim">
          <Panel title="İzleme ve denetim" description="İşlem geçmişi, raporlar ve servis sağlığı." className="rounded-xl">
            <div className="divide-y divide-border">
              {[{ href: "/raporlar", label: "İşlem raporları", description: "Kullanıcı ve işlem dağılımları", permission: "audit.read" }, { href: "/denetim", label: "Denetim kayıtları", description: "Kim, ne zaman, hangi işlemi yaptı?", permission: "audit.read" }, { href: "/operations", label: "Servis sağlığı", description: "Servisler, uyarılar ve kalite", permission: "operations.read" }].filter(item => allowed(item.permission)).map(item => <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><Activity className="size-4 shrink-0 text-muted-foreground" aria-hidden /><span className="flex-1"><span className="block text-sm font-medium">{item.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span></span><ChevronRight className="size-4 text-muted-foreground" aria-hidden /></Link>)}
              {!allowed("audit.read") && !allowed("operations.read") && <p className="p-4 text-sm text-muted-foreground">Raporları görüntülemek için ilgili erişim yetkisi gereklidir.</p>}
            </div>
          </Panel>
        </section>
      </div>
    </div>
  </div>;
}
