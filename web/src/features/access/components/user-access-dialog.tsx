"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronRight, Search, ShieldCheck, Star, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  loadSubjectAccessAction,
  saveSubjectAccessAction,
} from "@/features/access/api/subject-access-actions";
import { permissionNames, type ManagedRole, type ManagedSubject } from "@/features/access/model/administration";
import type { OrganizationUnit } from "@/features/organization/model/unit-plans";
import { saveDirectoryUserAction } from "@/features/organization/api/directory-user-actions";
import { directorySourceLabels, type DirectoryUser } from "@/features/organization/model/directory-user";

type Tab = "profile" | "roles" | "units";

const fold = (value: string) => value.toLocaleLowerCase("tr");

/**
 * Kullanıcının erişimini tek yerden kurar.
 *
 * <para>
 * Yetki iki eksenden gelir ve ikisi birlikte görülmeli: <strong>roller</strong>
 * ne yapabileceğini, <strong>birimler</strong> hangi kapsamda yapabileceğini
 * belirler. Eskiden rol ataması bir ekranda, birim üyeliği bambaşka bir sekmede
 * duruyordu; bir kullanıcının erişimini anlamak için iki yeri gezmek gerekiyordu.
 * </para>
 */
export function UserAccessDialog({ subjectId, roles, units, profile, open, onOpenChange, onSaved }: {
  subjectId: string;
  roles: ManagedRole[];
  units: OrganizationUnit[];
  /** Kullanıcının künyesi; henüz giriş yapmamış kişide tanımsızdır. */
  profile?: DirectoryUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("roles");
  const [subject, setSubject] = useState<ManagedSubject | null>(null);
  const [roleIds, setRoleIds] = useState<Set<string>>(new Set());
  const [unitIds, setUnitIds] = useState<Set<string>>(new Set());
  const [primaryUnitId, setPrimaryUnitId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [identity, setIdentity] = useState(() => ({
    displayName: profile?.displayName ?? "",
    email: profile?.email ?? "",
    title: profile?.title ?? "",
    isActive: profile?.isActive ?? true,
  }));
  const [savingIdentity, setSavingIdentity] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true); setError(""); setTab("roles");

    void loadSubjectAccessAction(subjectId).then(result => {
      if (cancelled) return;
      if (result.error) setError(result.error);
      setSubject(result.subject);
      setRoleIds(new Set(result.subject?.roleIds ?? []));
      setUnitIds(new Set(result.memberships.map(item => item.unitId)));
      setPrimaryUnitId(result.memberships.find(item => item.isPrimary)?.unitId ?? null);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [open, subjectId]);

  const permissions = useMemo(
    () => [...new Set(roles.filter(role => roleIds.has(role.id)).flatMap(role => role.permissions))].sort(),
    [roles, roleIds],
  );

  const tree = useMemo(() => buildUnitTree(units), [units]);
  const matches = useMemo(() => {
    const needle = fold(search.trim());
    if (!needle) return null;
    return new Set(units.filter(unit => fold(`${unit.code} ${unit.name}`).includes(needle)).map(unit => unit.id));
  }, [units, search]);

  function toggleUnit(unitId: string, checked: boolean) {
    setUnitIds(current => {
      const next = new Set(current);
      if (checked) next.add(unitId);
      else { next.delete(unitId); if (primaryUnitId === unitId) setPrimaryUnitId(null); }
      return next;
    });
  }

  async function save() {
    if (!subject || pending) return;
    setPending(true); setError("");
    const result = await saveSubjectAccessAction({
      subjectId,
      version: subject.version,
      roleIds: [...roleIds],
      unitIds: [...unitIds],
      primaryUnitId,
    });
    setPending(false);
    if (result.error) { setError(result.error); return; }
    toast.success(`${subjectId} erişimi güncellendi.`);
    onSaved?.();
    onOpenChange(false);
  }

  const tabs: { key: Tab; label: string; count?: number; icon: typeof UserCog }[] = [
    { key: "profile", label: "Kullanıcı bilgileri", icon: UserCog },
    { key: "roles", label: "Roller", count: roleIds.size, icon: ShieldCheck },
    { key: "units", label: "Organizasyon birimleri", count: unitIds.size, icon: Building2 },
  ];

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-3xl">
      <DialogHeader className="shrink-0">
        <DialogTitle>Kullanıcı erişimi: {profile?.displayName || subjectId}</DialogTitle>
        <DialogDescription>
          Roller ne yapabileceğini, birimler hangi kapsamda yapabileceğini belirler. İkisini birlikte ayarlayın.
        </DialogDescription>
      </DialogHeader>

      <nav aria-label="Erişim sekmeleri" className="flex shrink-0 gap-1 border-b border-border">
        {tabs.map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key ? "true" : undefined}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
            {count !== undefined && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">{count}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto py-4 pr-1">
        {loading ? <p role="status" className="py-10 text-center text-sm text-muted-foreground">Yükleniyor…</p> : <>
          {tab === "profile" && <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <Fact label="Kurumsal kimlik" value={subjectId} mono />
              <Fact label="Künye kaynağı" value={profile ? directorySourceLabels[profile.source] ?? profile.source : "Kayıt yok"} />
              <Fact label="Son giriş" value={formatMoment(profile?.lastSeenAt)} />
              <Fact label="Son dizin eşitlemesi" value={formatMoment(profile?.lastSyncedAt)} />
              <Fact label="Atanmış rol" value={`${roleIds.size}`} />
              <Fact label="Birim üyeliği" value={`${unitIds.size}`} />
              <Fact label="Rollerden gelen izin" value={`${permissions.length}`} />
              <Fact label="Dizindeki birim" value={profile?.unitReference || "—"} />
            </dl>

            <form
              className="space-y-3 rounded-lg border border-border p-3"
              onSubmit={async event => {
                event.preventDefault();
                if (savingIdentity) return;
                setSavingIdentity(true); setError("");
                const result = await saveDirectoryUserAction(subjectId, identity);
                setSavingIdentity(false);
                if (result.error) { setError(result.error); return; }
                toast.success("Kullanıcı künyesi kaydedildi.");
                onSaved?.();
              }}
            >
              <p className="text-sm font-medium">Künye</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">Ad soyad
                  <Input className="mt-1.5" required maxLength={500} value={identity.displayName}
                    onChange={event => setIdentity({ ...identity, displayName: event.target.value })} />
                </label>
                <label className="text-sm font-medium">E-posta
                  <Input className="mt-1.5" type="email" maxLength={500} value={identity.email}
                    onChange={event => setIdentity({ ...identity, email: event.target.value })} />
                </label>
                <label className="text-sm font-medium">Unvan
                  <Input className="mt-1.5" maxLength={300} value={identity.title}
                    onChange={event => setIdentity({ ...identity, title: event.target.value })} />
                </label>
                <label className="flex items-end gap-2 pb-1.5 text-sm font-medium">
                  <input type="checkbox" className="size-4" checked={identity.isActive}
                    onChange={event => setIdentity({ ...identity, isActive: event.target.checked })} />
                  Hesap etkin
                </label>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Elle kaydedilen künye dizin eşitlemesinde ezilmez; dizindeki adı yeniden geçerli
                kılmak için künyeyi boşaltmak yerine eşitlemeyi çalıştırın.
              </p>
              <Button type="submit" variant="outline" size="sm" disabled={savingIdentity}>
                {savingIdentity ? "Kaydediliyor…" : "Künyeyi kaydet"}
              </Button>
            </form>

            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
              Bu ekran kimlik sağlayıcıda hesap veya parola oluşturmaz; yalnız uygulama içindeki
              künyeyi, rol ve birim atamalarını yönetir. Dizin eşitlemesinden gelen üyelikler bir
              sonraki eşitlemede yeniden kurulabilir.
            </div>
          </div>}

          {tab === "roles" && <div className="space-y-4">
            {roles.length === 0
              ? <p className="text-sm text-muted-foreground">Önce Roller sekmesinden rol oluşturun.</p>
              : <div className="grid gap-2 sm:grid-cols-2">
                  {roles.map(role => {
                    const checked = roleIds.has(role.id);
                    return <label key={role.id} className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                      checked ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/40",
                    )}>
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0"
                        checked={checked}
                        onChange={event => setRoleIds(current => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(role.id); else next.delete(role.id);
                          return next;
                        })}
                      />
                      <span className="min-w-0 text-sm">
                        <span className="block font-medium">{role.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {role.code} · {role.permissions.length} izin · {role.memberCount} kullanıcı
                        </span>
                      </span>
                    </label>;
                  })}
                </div>}

            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Seçili rollerden gelen izinler ({permissions.length})
              </summary>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {permissions.map(code => <li key={code} className="text-xs">
                  {permissionNames[code] ?? code}
                  <span className="block font-mono text-muted-foreground">{code}</span>
                </li>)}
                {permissions.length === 0 && <li className="text-xs text-muted-foreground">Seçili rol yok.</li>}
              </ul>
            </details>
          </div>}

          {tab === "units" && <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Birim kodu veya adında ara…"
                aria-label="Birimlerde ara"
                className="pl-8"
              />
            </div>

            {units.length === 0
              ? <p className="text-sm text-muted-foreground">Kurum birimi tanımlı değil.</p>
              : <ul aria-label="Organizasyon birimleri" className="rounded-md border border-input">
                  {tree.map(node => (
                    <UnitRow
                      key={node.id}
                      node={node}
                      depth={0}
                      checked={unitIds}
                      primaryUnitId={primaryUnitId}
                      collapsed={collapsed}
                      matches={matches}
                      onToggleCollapse={id => setCollapsed(current => {
                        const next = new Set(current);
                        next.has(id) ? next.delete(id) : next.add(id);
                        return next;
                      })}
                      onToggle={toggleUnit}
                      onPrimary={setPrimaryUnitId}
                    />
                  ))}
                </ul>}

            <p className="text-xs leading-5 text-muted-foreground">
              Birim üyeliği, kullanıcının hangi birimin belgelerini ve fiziksel dosyalarını
              görebileceğini belirler. Birincil birim, yeni kayıtlarda varsayılan olarak seçilir.
            </p>
          </div>}

          {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        </>}
      </div>

      <DialogFooter className="shrink-0">
        <DialogClose render={<Button type="button" variant="outline" />}>İptal</DialogClose>
        <Button type="button" onClick={save} disabled={pending || loading || !subject}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

/** Bilinmeyen zaman damgası tabloda boşluk bırakmasın. */
function formatMoment(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString("tr-TR") : "—";
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-lg border border-border p-3">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className={cn("mt-1 break-all text-sm font-medium", mono && "font-mono")}>{value}</dd>
  </div>;
}

type UnitNode = OrganizationUnit & { children: UnitNode[] };

function buildUnitTree(units: OrganizationUnit[]): UnitNode[] {
  const byId = new Map<string, UnitNode>(units.map(unit => [unit.id, { ...unit, children: [] }]));
  const roots: UnitNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const sort = (nodes: UnitNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    nodes.forEach(node => sort(node.children));
  };
  sort(roots);
  return roots;
}

/** Arama, eşleşen düğümün atalarını da görünür tutar; yoksa ağaç kopuk görünür. */
function subtreeMatches(node: UnitNode, matches: Set<string> | null): boolean {
  if (!matches) return true;
  if (matches.has(node.id)) return true;
  return node.children.some(child => subtreeMatches(child, matches));
}

function UnitRow({ node, depth, checked, primaryUnitId, collapsed, matches, onToggleCollapse, onToggle, onPrimary }: {
  node: UnitNode;
  depth: number;
  checked: Set<string>;
  primaryUnitId: string | null;
  collapsed: Set<string>;
  matches: Set<string> | null;
  onToggleCollapse: (id: string) => void;
  onToggle: (unitId: string, checked: boolean) => void;
  onPrimary: (unitId: string | null) => void;
}) {
  if (!subtreeMatches(node, matches)) return null;

  const isChecked = checked.has(node.id);
  const isPrimary = primaryUnitId === node.id;
  const hasChildren = node.children.length > 0;
  const isOpen = !collapsed.has(node.id);

  return <>
    <li className="flex items-center gap-2 border-b border-border px-2 py-1.5 last:border-b-0">
      <span style={{ paddingLeft: `${depth * 1.1}rem` }} className="flex min-w-0 flex-1 items-center gap-2">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleCollapse(node.id)}
            aria-expanded={isOpen}
            aria-label={isOpen ? `${node.name} daralt` : `${node.name} genişlet`}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
          >
            {isOpen ? <ChevronDown className="size-3.5" aria-hidden /> : <ChevronRight className="size-3.5" aria-hidden />}
          </button>
        ) : <span className="size-5 shrink-0" aria-hidden />}

        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="size-4 shrink-0"
            checked={isChecked}
            onChange={event => onToggle(node.id, event.target.checked)}
          />
          <Building2 className="size-3.5 shrink-0 text-amber-600" aria-hidden />
          <span className="min-w-0 truncate text-sm">
            {node.name}
            <span className="ml-2 font-mono text-xs text-muted-foreground">{node.code}</span>
          </span>
        </label>
      </span>

      {isChecked && (
        <button
          type="button"
          onClick={() => onPrimary(isPrimary ? null : node.id)}
          aria-pressed={isPrimary}
          title={isPrimary ? "Birincil birim" : "Birincil birim yap"}
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded transition-colors",
            isPrimary ? "text-amber-500" : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Star className={cn("size-4", isPrimary && "fill-current")} aria-hidden />
          <span className="sr-only">{node.name} birincil birim</span>
        </button>
      )}
    </li>

    {isOpen && node.children.map(child => (
      <UnitRow
        key={child.id}
        node={child}
        depth={depth + 1}
        checked={checked}
        primaryUnitId={primaryUnitId}
        collapsed={collapsed}
        matches={matches}
        onToggleCollapse={onToggleCollapse}
        onToggle={onToggle}
        onPrimary={onPrimary}
      />
    ))}
  </>;
}
