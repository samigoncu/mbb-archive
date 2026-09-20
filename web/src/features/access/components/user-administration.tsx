"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronRight, CircleSlash, Clock, Info, LayoutGrid, List, Mail,
  Search, ShieldCheck, TriangleAlert, UserPlus, Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, Panel } from "@/components/ui/page";
import { cn } from "@/lib/utils";
import { UserAccessDialog } from "@/features/access/components/user-access-dialog";
import { UserRowActions } from "@/features/access/components/user-row-actions";
import type { ManagedRole, ManagedSubject } from "@/features/access/model/administration";
import type { OrganizationUnit } from "@/features/organization/model/unit-plans";
import type { DirectoryUser } from "@/features/organization/model/directory-user";

const pageSize = 25;

/** Görünen addan okunabilir bir baş harf; avatar yerine geçer. */
function initial(name: string): string {
  const letter = name.trim().replace(/[^\p{L}\p{N}]/gu, "").charAt(0);
  return (letter || "?").toLocaleUpperCase("tr");
}

/**
 * Kullanıcı ve erişim yönetimi.
 *
 * <para>
 * Varsayılan görünüm listedir: çok kullanıcıda satır düzeni taramayı
 * kolaylaştırır. Kart görünümü, az sayıda kullanıcıda rolleri bir bakışta
 * görmek için elde kalır. Düzenleme, rol ve birim atamasını bir arada tutan
 * sekmeli bir pencerede yapılır.
 * </para>
 */
export function UserAdministration({ base, roles, units, subjects, directory, directoryTruncated, directoryError, search, pendingOnly, page }: {
  base: string;
  roles: ManagedRole[];
  units: OrganizationUnit[];
  subjects: { items: ManagedSubject[]; totalCount: number };
  /** Bilinen künyeler; ham kimlik yerine ad soyad göstermek için. */
  directory: DirectoryUser[];
  /** Künye listesi sınıra takıldı: bazı kullanıcılar listede olmayabilir. */
  directoryTruncated?: boolean;
  /** Künye okunamadıysa nedeni; ekran ham kimlikle çalışmaya devam eder. */
  directoryError?: string;
  search: string;
  pendingOnly: boolean;
  page: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [newSubject, setNewSubject] = useState("");
  // Varsayılan liste: çok kullanıcıda satır düzeni taramayı kolaylaştırır.
  const [view, setView] = useState<"list" | "cards">("list");

  const first = subjects.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = (page - 1) * pageSize + subjects.items.length;
  const query = (overrides: Record<string, string>) => {
    const next = new URLSearchParams({ tab: "users", search, page: String(page), ...overrides });
    if (pendingOnly && !("durum" in overrides)) next.set("durum", "bekleyen");
    if (next.get("durum") === "") next.delete("durum");
    return `${base}?${next}`;
  };

  const roleName = (id: string) => roles.find(role => role.id === id)?.name ?? id;

  const profiles = new Map(directory.map(user => [user.subjectId, user]));
  const profile = (subjectId: string) => profiles.get(subjectId);
  const nameOf = (subjectId: string) => profile(subjectId)?.displayName || subjectId;

  return <div className="flex flex-col gap-5">
    <aside className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-sm leading-6 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        Liste, rol atanmış kullanıcıların yanında <strong>giriş yapmış ama henüz yetkilendirilmemiş</strong> kişileri
        de gösterir: ilk girişte kullanıcı künyesi açılır, fakat kayıt tek başına erişim vermez.
        Yetki iki eksenden gelir: <strong>roller</strong> ne yapabileceğini, <strong>birimler</strong> hangi kapsamda yapabileceğini belirler.
      </p>
    </aside>

    {(directoryError || directoryTruncated) && (
      <aside role="alert" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          {directoryError ?? "Kullanıcı künyesi listesi sınıra takıldı; erişim bekleyen kullanıcıların tamamı listelenmiyor olabilir. Ad ya da kimlikle arayarak daraltın."}
        </p>
      </aside>
    )}

    <div className="flex flex-wrap items-end gap-3">
      <form role="search" className="flex min-w-0 flex-1 gap-2">
        <input type="hidden" name="tab" value="users" />
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input name="search" defaultValue={search} className="pl-8" placeholder="Ad soyad, kimlik ya da e-posta ile ara" aria-label="Kullanıcılarda ara" />
        </div>
        {/* Arama yapınca seçili süzgeç korunsun. */}
        {pendingOnly && <input type="hidden" name="durum" value="bekleyen" />}
        <Button type="submit" variant="outline">Ara</Button>
      </form>

      <form className="flex gap-2">
        <input type="hidden" name="tab" value="users" />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-subject" className="sr-only">Kurumsal kullanıcı kimliği</Label>
          <Input
            id="new-subject"
            name="subject"
            required
            maxLength={300}
            value={newSubject}
            onChange={event => setNewSubject(event.target.value)}
            placeholder="Yeni kullanıcı kimliği"
          />
        </div>
        <Button type="submit"><UserPlus className="size-4" aria-hidden />Kullanıcı tanımla</Button>
      </form>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Kullanıcı süzgeci" className="flex rounded-lg border border-border bg-card p-1">
          {[{ value: "", label: "Tümü" }, { value: "bekleyen", label: "Erişim bekleyen" }].map(({ value, label }) => (
            <Link
              key={value || "all"}
              href={query({ durum: value, page: "1" })}
              aria-current={(value === "bekleyen") === pendingOnly ? "true" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                (value === "bekleyen") === pendingOnly ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-muted-foreground">
          {subjects.totalCount.toLocaleString("tr-TR")} kullanıcı
        </p>
      </div>
      <nav aria-label="Kullanıcı görünümü" className="flex rounded-lg border border-border bg-card p-1">
        {[{ value: "list" as const, label: "Liste", Icon: List }, { value: "cards" as const, label: "Kart", Icon: LayoutGrid }].map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setView(value)}
            aria-current={view === value ? "true" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              view === value ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />{label}
          </button>
        ))}
      </nav>
    </div>

    {search && <p className="text-xs text-muted-foreground">
      &ldquo;{search}&rdquo; için {subjects.totalCount} sonuç · <Link href={query({ search: "", page: "1" })} className="underline underline-offset-2">aramayı temizle</Link>
    </p>}

    {subjects.items.length === 0
      ? <Panel>
          <EmptyState
            icon={Users}
            title={pendingOnly ? "Erişim bekleyen kullanıcı yok" : search ? "Eşleşen kullanıcı yok" : "Henüz kullanıcı yok"}
            description={pendingOnly
              ? "Giriş yapmış herkesin en az bir rolü var."
              : search
                ? "Arama ölçütünü değiştirin ya da yukarıdaki kutudan kullanıcıyı kimliğiyle tanımlayın."
                : "Kullanıcılar ilk girişlerinde kendiliğinden listeye düşer; dilerseniz yukarıdaki kutuya kimliği girerek şimdiden yetkilendirin."}
          />
        </Panel>
      : view === "list"
        ? <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[920px] text-left text-sm">
              <caption className="sr-only">Kullanıcılar ve erişimleri</caption>
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  {/* Roller boşluğu emer, işlemler sağ kenara yaslanır. */}
                  {([
                    ["Kullanıcı", ""],
                    ["Birim", ""],
                    ["Roller", "w-full"],
                    ["İzin", "whitespace-nowrap"],
                    ["İşlemler", "whitespace-nowrap text-right"],
                  ] as const).map(([label, width]) => (
                    <th key={label} scope="col" className={cn("px-4 py-3 font-medium", width)}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subjects.items.map(item => (
                  <tr key={item.subjectId} className="align-middle hover:bg-muted/30">
                    <td className="max-w-xs px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-xs font-semibold">
                          {initial(nameOf(item.subjectId))}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{nameOf(item.subjectId)}</span>
                          {/* Ad değişse de rol ve birim ataması bu kimliğe bağlıdır. */}
                          <span className="block truncate font-mono text-xs text-muted-foreground" title={item.subjectId}>
                            {item.subjectId}
                          </span>
                          {profile(item.subjectId)?.email && (
                            <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                              <Mail className="size-3 shrink-0" aria-hidden />{profile(item.subjectId)!.email}
                            </span>
                          )}
                        </span>
                      </span>
                    </td>
                    <td className="max-w-[12rem] px-4 py-3 text-xs text-muted-foreground">
                      <span className="block truncate" title={profile(item.subjectId)?.title ?? undefined}>
                        {profile(item.subjectId)?.unitReference ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1.5">
                        {item.roleIds.length === 0
                          ? <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300">
                              <Clock className="size-3" aria-hidden />Erişim bekliyor
                            </Badge>
                          : item.roleIds.map(id => (
                              <Badge key={id} variant="outline" className="gap-1">
                                <ShieldCheck className="size-3" aria-hidden />{roleName(id)}
                              </Badge>
                            ))}
                        {profile(item.subjectId)?.isActive === false && (
                          <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
                            <CircleSlash className="size-3" aria-hidden />Dizinde kapalı
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{item.permissions.length}</td>
                    <td className="px-4 py-3">
                      <span className="flex justify-end">
                        <UserRowActions base={base} subject={item} wrap={false} onEdit={() => setEditing(item.subjectId)} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        : <ul aria-label="Kullanıcılar" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.items.map(item => (
            <li key={item.subjectId}>
              <article className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <header className="flex items-start gap-3">
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-sm font-semibold">
                    {initial(nameOf(item.subjectId))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{nameOf(item.subjectId)}</span>
                    <span className="block truncate font-mono text-xs text-muted-foreground" title={item.subjectId}>{item.subjectId}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.roleIds.length} rol · {item.permissions.length} izin
                    </span>
                  </span>
                </header>

                <div className="flex flex-wrap gap-1.5">
                  {item.roleIds.length === 0
                    ? <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300">
                        <Clock className="size-3" aria-hidden />Erişim bekliyor
                      </Badge>
                    : item.roleIds.slice(0, 3).map(id => (
                        <Badge key={id} variant="outline" className="gap-1">
                          <ShieldCheck className="size-3" aria-hidden />{roleName(id)}
                        </Badge>
                      ))}
                  {item.roleIds.length > 3 && <Badge variant="outline">+{item.roleIds.length - 3}</Badge>}
                </div>

                <footer className="mt-auto flex flex-wrap gap-2 border-t border-border pt-3">
                  <UserRowActions base={base} subject={item} onEdit={() => setEditing(item.subjectId)} />
                </footer>
              </article>
            </li>
          ))}
        </ul>}

    {subjects.totalCount > pageSize && (
      <nav aria-label="Kullanıcı sayfaları" className="flex items-center justify-between gap-2 text-xs">
        <span className="tabular-nums text-muted-foreground">
          {first}–{last} / {subjects.totalCount.toLocaleString("tr-TR")}
        </span>
        <span className="flex gap-1">
          {page > 1 && <Link href={query({ page: String(page - 1) })} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted">
            <ChevronLeft className="size-3.5" aria-hidden />Önceki
          </Link>}
          {page * pageSize < subjects.totalCount && <Link href={query({ page: String(page + 1) })} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted">
            Sonraki<ChevronRight className="size-3.5" aria-hidden />
          </Link>}
        </span>
      </nav>
    )}

    {editing && (
      <UserAccessDialog
        key={editing}
        subjectId={editing}
        roles={roles}
        units={units}
        profile={profile(editing)}
        open
        onOpenChange={open => { if (!open) setEditing(null); }}
        onSaved={() => router.refresh()}
      />
    )}
  </div>;
}

/** Aynı kart düzeni roller için; izin ve kullanıcı sayısı kartta görünür. */
export function RoleCards({ base, roles, selectedRoleId }: {
  base: string;
  roles: ManagedRole[];
  selectedRoleId?: string;
}) {
  if (roles.length === 0) {
    return <Panel>
      <EmptyState
        icon={ShieldCheck}
        title="Henüz rol tanımlanmadı"
        description="Rol, bir grup izni bir arada taşır. Önce rolü oluşturun, sonra kullanıcılara atayın."
      />
    </Panel>;
  }

  return <ul aria-label="Roller" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {roles.map(role => {
      const isSelected = role.id === selectedRoleId;
      return <li key={role.id}>
        <Link
          href={`${base}?tab=roles&role=${role.id}`}
          aria-current={isSelected ? "true" : undefined}
          className={cn(
            "flex h-full flex-col gap-3 rounded-xl border bg-card p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
          )}
        >
          <span className="flex items-start gap-3">
            <span aria-hidden className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg border",
              isSelected ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground",
            )}>
              <ShieldCheck className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{role.name}</span>
              <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">{role.code}</span>
            </span>
          </span>
          <span className="mt-auto flex flex-wrap gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><ShieldCheck className="size-3.5" aria-hidden />{role.permissions.length} izin</span>
            <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden />{role.memberCount} kullanıcı</span>
          </span>
        </Link>
      </li>;
    })}
  </ul>;
}
