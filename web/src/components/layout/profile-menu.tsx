"use client";
import Link from "next/link";
import { UserRound, ClipboardList, LogOut, ChevronDown } from "lucide-react";
import type { CurrentUser } from "@/features/access/model/current-user";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
export function ProfileMenu({ user }: { user?: CurrentUser | null }) {
  return <DropdownMenu>
    <DropdownMenuTrigger aria-label="Profil menüsü" className="flex items-center gap-2 rounded-lg border border-border p-1.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="size-4" aria-hidden /></span><span className="hidden max-w-32 truncate text-xs font-medium xl:block">{user?.authenticationMode === "Development" ? "Geliştirme hesabı" : "Hesabım"}</span><ChevronDown className="size-3.5" aria-hidden /></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-64">
      <div className="border-b border-border px-3 py-3"><p className="text-sm font-semibold">{user?.authenticationMode === "Development" ? "Geliştirme hesabı" : "Kurum hesabı"}</p><p className="mt-1 break-all text-xs text-muted-foreground">{user?.subject ?? "Kimlik bilgisi alınamadı"}</p></div>
      <DropdownMenuItem render={<Link href="/profil" />} className="p-3"><UserRound />Profilim ve yetkilerim</DropdownMenuItem>
      <DropdownMenuItem render={<Link href="/gorevlerim" />} className="p-3"><ClipboardList />Görevlerim</DropdownMenuItem>
      <DropdownMenuSeparator />
      <form action="/api/auth/logout" method="post"><DropdownMenuItem render={<button type="submit" />} variant="destructive" className="w-full p-3"><LogOut />Çıkış yap</DropdownMenuItem></form>
    </DropdownMenuContent>
  </DropdownMenu>;
}
