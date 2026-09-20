import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BookMarked,
  BarChart3,
  Boxes,
  ClipboardList,
  FileSignature,
  FileStack,
  FolderTree,
  Gavel,
  HandCoins,
  LayoutDashboard,
  Map,
  ScanLine,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** `planned` kalemler bağlantı değil, devre dışı olarak çizilir. */
  status: "ready" | "planned";
  permission?: string;
  /** Devre dışı kalemin neden beklediği; ipucu olarak gösterilir. */
  plannedNote?: string;
};

export type NavGroup = {
  /** Ana Sayfa gibi tek başına duran kalemler için başlık verilmez. */
  title?: string;
  items: NavItem[];
};

/**
 * Bilgi mimarisi uygulama direktifi §14'ten gelir. Henüz ekranı olmayan
 * kalemler bilinçli olarak listede tutulur ancak `planned` işaretiyle devre dışı
 * çizilir; navigasyonun bütünlüğü baştan görünür olsun diye. Sahte bağlantı
 * eklenmez.
 */
export const navGroups: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Ana Sayfa", icon: LayoutDashboard, status: "ready" },
      { href: "/kesfet", label: "Arşivi Keşfet", icon: Archive, status: "ready", permission: "search.read" },
    ],
  },
  {
    title: "Kurumsal Arşiv",
    items: [
      {
        href: "/documents",
        label: "Tüm Belgeler",
        icon: BookMarked,
        status: "ready",
      },
      {
        href: "/dosya-islemleri",
        label: "Fiziksel Dosyalar",
        icon: FileStack,
        status: "ready",
      },
      {
        href: "/koleksiyonlar",
        label: "Koleksiyonlar",
        icon: Star,
        status: "ready",
        permission: "collections.read",
      },
    ],
  },
  {
    title: "Ara",
    items: [
      { href: "/arama", label: "Genel Arama", icon: Search, status: "ready" },
      {
        href: "/harita",
        label: "Haritada Ara",
        icon: Map,
        status: "ready",
        permission: "geo.read",
      },
    ],
  },
  {
    title: "Süreçler",
    items: [
      { href: "/islem-takibi", label: "İşlem Takibi", icon: ClipboardList, status: "ready", permission: "documents.read" },
      {
        href: "/tarama",
        label: "Tarama ve İndeksleme",
        icon: ScanLine,
        status: "ready",
      },
      {
        href: "/odunc",
        label: "Ödünç & Zimmet",
        icon: HandCoins,
        status: "ready",
      },
      {
        href: "/gorevlerim",
        label: "Görevlerim",
        icon: ClipboardList,
        status: "ready",
        permission: "workflow.read",
      },
    ],
  },
  {
    title: "Fiziksel Arşiv",
    items: [
      {
        href: "/arsiv-yerlesimi",
        label: "Arşiv Yerleşimi",
        icon: Archive,
        status: "ready",
      },
      {
        href: "/arsiv-simulatoru",
        label: "Arşiv Simülatörü",
        icon: Boxes,
        status: "ready",
      },
    ],
  },
  {
    title: "Kayıt Yönetimi",
    items: [
      {
        href: "/devir-imha",
        label: "Saklama & İmha",
        icon: Trash2,
        status: "ready",
      },
      {
        href: "/devir-imha/islemler",
        label: "Komisyon & Devir",
        icon: Gavel,
        status: "ready",
        permission: "retention.read",
      },
      {
        href: "/kayit-beyani",
        label: "Kayıt Beyanı",
        icon: Gavel,
        status: "ready",
        permission: "archive.records.read",
      },
      {
        href: "/kanit",
        label: "Kanıt & İmza",
        icon: FileSignature,
        status: "ready",
        permission: "evidence.read",
      },
    ],
  },
  {
    title: "Raporlama",
    items: [
      {
        href: "/raporlar",
        label: "Kullanıcı ve İşlem Raporları",
        icon: BarChart3,
        status: "ready",
        permission: "audit.read",
      },
    ],
  },
  {
    title: "Yönetim",
    items: [
      { href: "/tanimlamalar/yetkiler", label: "Kullanıcı ve Yetki Yönetimi", icon: ShieldCheck, status: "ready", permission: "access.admin" },
      {
        href: "/tanimlamalar",
        label: "Tanımlar",
        icon: FolderTree,
        status: "ready",
      },
      {
        href: "/operations",
        label: "Servis & Kalite",
        icon: ShieldCheck,
        status: "ready",
      },
      {
        href: "/denetim",
        label: "Denetim Kayıtları",
        icon: ScrollText,
        status: "ready",
        permission: "audit.read",
      },
      { href: "/ayarlar", label: "Sistem Ayarları", icon: Settings, status: "ready" },
    ],
  },
];

/** Düz liste; breadcrumb ve yetki süzgeci için. */
export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === "/") {
    return navItems[0];
  }

  return navItems
    .filter(
      (item) =>
        item.href !== "/" &&
        (pathname === item.href || pathname.startsWith(`${item.href}/`)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}
