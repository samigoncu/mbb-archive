"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, FileSliders, FolderTree, Globe, Layers, Map, Network, Palette, ScanLine, Server, Settings2, ShieldCheck, Users, Eye, Upload, Activity, ChevronRight } from "lucide-react";
import type { CurrentUser } from "@/features/access/model/current-user";
import { cn } from "@/lib/utils";

const definitions = [
  { href: "/tanimlamalar", label: "Dosya planları", description: "SDP ve sınıflandırma", icon: FolderTree, permission: "classification.read" },
  { href: "/tanimlamalar/birimler", label: "Kurum birimleri", description: "Birimler ve üyelikler", icon: Building2, permission: "organization.read" },
  { href: "/tanimlamalar/birim-seviyeleri", label: "Birim seviyeleri", description: "Daire, şube, servis kalıbı", icon: Network, permission: "organization.read" },
  { href: "/tanimlamalar/ustveri", label: "Üstveri şemaları", description: "Alanlar ve sürümler", icon: FileSliders, permission: "classification.read" },
  { href: "/tanimlamalar/yerlesim-seviyeleri", label: "Arşiv yerleşim seviyeleri", description: "Bina, oda, dolap, raf kalıbı", icon: Layers, permission: "physical-archive.read" },
  { href: "/tanimlamalar/cbs", label: "CBS servisleri", description: "WFS, WMS ve harita altlığı", icon: Map, permission: "geo.read" },
  { href: "/tanimlamalar/ldap", label: "LDAP dizin entegrasyonu", description: "Bağlantı, eşleme ve eşitleme", icon: Server, permission: "organization.manage" },
  { href: "/tanimlamalar/api", label: "Belediye API entegrasyonu", description: "Malatya API, SMS ve Dizin", icon: Globe, permission: "organization.manage" },
  { href: "/tanimlamalar/paylasimlar", label: "Paylaşımlar", description: "Kaynak erişim izinleri", icon: Users, permission: "access.grants.read" },
];
const settings = [
  { href: "/ayarlar#kurumsal", label: "Kurum kimliği", description: "Logo, başlık ve görseller", icon: Palette },
  { href: "/ayarlar#yukleme", label: "Yükleme ve OCR", description: "Dosya boyutu ve işleme", icon: Upload },
  { href: "/ayarlar#oturum", label: "Oturum ve güvenlik", description: "Kimlik ve yetki yönetimi", icon: ShieldCheck },
  { href: "/ayarlar#tarayici", label: "Tarayıcı bağlantısı", description: "Tarama cihazlarına erişim", icon: ScanLine },
  { href: "/ayarlar#izleme", label: "İzleme ve denetim", description: "Raporlar ve servis durumu", icon: Activity },
];
export function AdministrationNavigation({ user }: { user: CurrentUser | null }) {
  const pathname = usePathname();
  const isSettings = pathname === "/ayarlar";
  const [hash, setHash] = useState("");
  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync(); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);
  // Kullanıcı ve yetki yönetimi sol menüde kendi kalemi; Tanımlar şeridini
  // taşımaz, yoksa o menünün içindeymiş gibi görünür.
  if (pathname.startsWith("/tanimlamalar/yetkiler")) return null;
  const allowedDefinitions = definitions.filter(item => user?.isBootstrapAdministrator || user?.permissions.includes(item.permission));
  const items = isSettings ? settings : allowedDefinitions;
  const selected = isSettings ? `/ayarlar${hash || "#yukleme"}` : pathname;
  return <section className="overflow-hidden rounded-xl border border-border bg-card shadow-flat" aria-label="Yönetim bölümleri">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2 text-sm"><Settings2 className="size-4 text-muted-foreground" aria-hidden /><span className="font-semibold">Yönetim merkezi</span><ChevronRight className="size-3.5 text-muted-foreground" aria-hidden /><span className="text-muted-foreground">{isSettings ? "Sistem ayarları" : "Tanımlar"}</span></div>
    </div>
    <nav aria-label={isSettings ? "Ayar bölümleri" : "Tanım yönetimi"} className={cn("grid gap-1.5 p-3 sm:grid-cols-2 lg:grid-cols-3", isSettings ? "2xl:grid-cols-6" : "2xl:grid-cols-6")}>
      {items.map(({ href, label, description, icon: Icon }) => <Link key={href} href={href} onClick={() => { if (isSettings) setHash(href.slice(href.indexOf("#"))); }} aria-current={href === selected ? isSettings ? "location" : "page" : undefined}
        className={cn("group flex min-w-0 items-start gap-3 rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", href === selected ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100" : "border-transparent text-foreground hover:border-border hover:bg-muted/60")}>
        <Icon className={cn("mt-0.5 size-4 shrink-0", href === selected ? "text-sky-700 dark:text-sky-300" : "text-muted-foreground")} aria-hidden />
        <span className="min-w-0"><span className="block text-sm font-semibold leading-5">{label}</span><span className="mt-1 block text-xs leading-4 text-muted-foreground">{description}</span></span>
      </Link>)}
      {!items.length && <p className="p-3 text-sm text-muted-foreground">{user ? "Bu alanda görüntüleme yetkiniz olan bir tanım bulunmuyor." : "Menü yetkileri alınamadı. Sayfayı yenileyin."}</p>}
    </nav>
  </section>;
}
