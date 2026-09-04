import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArrowLeftRight,
  BarChart3,
  BookMarked,
  Boxes,
  Building2,
  Calendar,
  FileStack,
  FolderTree,
  Gauge,
  HandCoins,
  LayoutDashboard,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  status: "ready" | "planned";
  permission?: string;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Ana Sayfa", icon: LayoutDashboard, status: "ready" },
  { href: "/tanimlamalar", label: "Tanımlamalar", icon: FolderTree, status: "ready" },
  { href: "/dosya-islemleri", label: "Dosya İşlemleri", icon: FileStack, status: "ready" },
  { href: "/tarama", label: "Tarama ve İndeksleme", icon: ScanLine, status: "ready" },
  { href: "/odunc", label: "Ödünç Sistemi", icon: HandCoins, status: "ready" },
  { href: "/arama", label: "Arama (OCR)", icon: Search, status: "ready" },
  { href: "/documents", label: "Belgeler & İnceleme", icon: BookMarked, status: "ready" },
  { href: "/arsiv-simulatoru", label: "Arşiv Simülatörü", icon: Boxes, status: "ready" },
  { href: "/arsiv-yerlesimi", label: "Arşiv Yerleşimi", icon: Archive, status: "ready" },
  { href: "/devir-imha", label: "Devir ve İmha", icon: Trash2, status: "ready" },
  { href: "/operations", label: "Servis Büro & Kalite", icon: ShieldCheck, status: "ready" },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings, status: "ready" },
];

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === "/") {
    return navItems[0];
  }

  return navItems
    .filter((item) => item.href !== "/" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
