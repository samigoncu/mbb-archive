import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BookMarked,
  FileStack,
  FolderTree,
  Gauge,
  HandCoins,
  LayoutDashboard,
  ScanLine,
  Search,
  Trash2,
} from "lucide-react";

/**
 * Menü kalemi. `permission` auth açıldığında (Faz 9) görünürlük kararı için
 * kullanılacak; şimdilik tüm kalemler görünür.

 */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  status: "ready" | "planned";
  permission?: string;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Ana Sayfa", icon: LayoutDashboard, status: "ready" },
  { href: "/tanimlamalar", label: "Tanımlamalar (SDP)", icon: FolderTree, status: "ready", permission: "classification.read" },
  { href: "/dosya-islemleri", label: "Dosya İşlemleri", icon: FileStack, status: "ready", permission: "physical-archive.read" },
  { href: "/arsiv-yerlesimi", label: "Arşiv Yerleşimi", icon: Archive, status: "ready", permission: "physical-archive.read" },
  { href: "/documents", label: "Belgeler & İnceleme", icon: BookMarked, status: "ready", permission: "documents.read" },
  { href: "/tarama", label: "Tarama ve İndeksleme", icon: ScanLine, status: "ready", permission: "scanning.write" },
  { href: "/odunc", label: "Ödünç Sistemi", icon: HandCoins, status: "ready", permission: "physical-archive.loan" },
  { href: "/arama", label: "Akıllı OCR Arama", icon: Search, status: "ready", permission: "search.read" },
  { href: "/devir-imha", label: "Devir ve İmha", icon: Trash2, status: "ready", permission: "retention.write" },
  { href: "/operations", label: "Operasyon Merkezi", icon: Gauge, status: "ready", permission: "operations.read" },
];

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === "/") {
    return navItems[0];
  }

  return navItems
    .filter((item) => item.href !== "/" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
