"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  FolderTree,
  GitBranch,
  Info,
  Layers,
  MoveRight,
  Pencil,
  Power,
  Search,
  Settings,
  ShieldAlert,
  Star,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/ui/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionForm } from "@/components/action-form";
import { ExportCsvButton } from "@/components/export-csv-button";
import { UnitPlanEditor } from "./unit-plan-editor";
import { UnitRecordDialog } from "./unit-record-dialog";
import { unitAction } from "../api/unit-actions";
import type {
  OrganizationUnit,
  UnitMember,
  UnitPlanDetails,
} from "../model/unit-plans";
import type { FilePlanTree } from "@/features/classification/model/classification";
import type { UnitTypeItem } from "../model/unit-type";
import { setUnitTypeAction } from "../api/unit-type-actions";

export function UnitDetailWorkspace({
  selected,
  details,
  members,
  units,
  unitTypes = [],
  trees,
  canManage,
  basePath,
}: {
  selected: OrganizationUnit;
  details: UnitPlanDetails;
  members: UnitMember[];
  units: OrganizationUnit[];
  /** Teşkilat seviyeleri; seçim üst birimin kademesine göre süzülür. */
  unitTypes?: UnitTypeItem[];
  trees: FilePlanTree[];
  canManage: boolean;
  basePath: string;
}) {
  const [memberSearch, setMemberSearch] = useState("");
  const [activeTab, setActiveTab] = useState("members");

  // Calculate hierarchy breadcrumbs (ancestors)
  const breadcrumbs = useMemo(() => {
    const list: OrganizationUnit[] = [];
    let current: OrganizationUnit | undefined = selected;
    while (current) {
      list.unshift(current);
      current = current.parentId
        ? units.find((u) => u.id === current?.parentId)
        : undefined;
    }
    return list;
  }, [selected, units]);

  // Child units count
  const childUnits = useMemo(
    () => units.filter((u) => u.parentId === selected.id),
    [units, selected.id],
  );

  // Filtered members list
  const filteredMembers = useMemo(() => {
    const term = memberSearch.trim().toLocaleLowerCase("tr");
    if (!term) return members;
    return members.filter((m) =>
      m.subjectId.toLocaleLowerCase("tr").includes(term),
    );
  }, [members, memberSearch]);

  const primaryCount = useMemo(
    () => members.filter((m) => m.isPrimary).length,
    [members],
  );

  const depth = (selected.path.match(/\//g) || []).length;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* HERO CARD: Unit Title, Breadcrumb & Key Metrics */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-xs">
        {/* Subtle decorative background gradient */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/5 blur-3xl"
          aria-hidden
        />

        {/* Breadcrumb Hierarchy */}
        <nav
          aria-label="Birim hiyerarşik konumu"
          className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span className="flex items-center gap-1 font-medium text-foreground/80">
            <Building2 className="size-3.5 text-primary" aria-hidden />
            Kurum Kökü
          </span>
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <span key={crumb.id} className="flex items-center gap-1.5">
                <ChevronRight className="size-3 text-muted-foreground/60" />
                {isLast ? (
                  <span className="font-semibold text-foreground">
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    href={`${basePath}unitId=${crumb.id}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {crumb.name}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        {/* Title & Badges */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {selected.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-medium text-foreground/80 border border-border/60">
                {selected.code}
              </span>
              {selected.isActive ? (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium text-xs"
                >
                  ● Aktif Birim
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Pasif Birim
                </Badge>
              )}
              {selected.typeName && (
                <Badge variant="outline" className="text-xs font-medium">
                  {selected.typeName}
                </Badge>
              )}
              {selected.shortName && (
                <span className="text-xs text-muted-foreground">
                  Kısa Ad: <strong className="text-foreground/90">{selected.shortName}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Eylemler ve Resmi Tutanak */}
          <div className="flex flex-wrap items-center gap-2">
            <UnitRecordDialog
              unit={selected}
              members={members}
              details={details}
              parentUnitName={units.find((u) => u.id === selected.parentId)?.name}
            />

            {canManage &&
              ([
                ["Düzenle", "birim-duzenle", Pencil, false],
                ["Taşı", "birim-tasi", MoveRight, false],
                [selected.isActive ? "Pasife al" : "Etkinleştir", "birim-durum", Power, false],
                ["Sil", "birim-sil", Trash2, true],
              ] as const).map(([label, target, Icon, danger]) => (
                <Button
                  key={target}
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "text-xs gap-1.5 h-8 font-medium shadow-2xs",
                    danger
                      ? "text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                      : "text-foreground hover:bg-muted",
                  )}
                  onClick={() => {
                    setActiveTab("settings");
                    requestAnimationFrame(() =>
                      document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "center" }),
                    );
                  }}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                </Button>
              ))}
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5 text-primary" />
              <span>Personel / Üye</span>
            </div>
            <p className="mt-1 text-lg font-bold tracking-tight text-foreground">
              {members.length}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                ({primaryCount} birincil)
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FolderTree className="size-3.5 text-amber-500" />
              <span>SDP Konu Başlığı</span>
            </div>
            <p className="mt-1 text-lg font-bold tracking-tight text-foreground">
              {details.items.length}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                eşleşmiş
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="size-3.5 text-blue-500" />
              <span>Bağlı Alt Birim</span>
            </div>
            <p className="mt-1 text-lg font-bold tracking-tight text-foreground">
              {childUnits.length}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                birim
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="size-3.5 text-indigo-500" />
              <span>Hiyerarşi Düzeyi</span>
            </div>
            <p className="mt-1 text-lg font-bold tracking-tight text-foreground">
              {depth === 0 ? "Kök" : `${depth}. Kademe`}
            </p>
          </div>
        </div>
      </section>

      {/* TABS CONTAINER */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList
          variant="line"
          className="border-b border-border pb-px group-data-horizontal/tabs:h-10 w-full justify-start gap-4"
        >
          <TabsTrigger value="members" className="gap-2 px-3 py-2 text-xs sm:text-sm">
            <Users className="size-4" aria-hidden />
            Üyeler ve Personel
            <span className="ml-1 rounded-full bg-muted px-2 py-0.2 text-xs text-muted-foreground font-mono">
              {members.length}
            </span>
          </TabsTrigger>

          <TabsTrigger value="plans" className="gap-2 px-3 py-2 text-xs sm:text-sm">
            <FolderTree className="size-4" aria-hidden />
            SDP Başlık Eşleştirmesi
            <span className="ml-1 rounded-full bg-muted px-2 py-0.2 text-xs text-muted-foreground font-mono">
              {details.items.length}
            </span>
          </TabsTrigger>

          <TabsTrigger value="settings" className="gap-2 px-3 py-2 text-xs sm:text-sm">
            <Settings className="size-4" aria-hidden />
            Birim Ayarları & Hiyerarşi
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ÜYELER VE PERSONEL */}
        <TabsContent value="members" className="space-y-4">
          <Panel
            title="Birim Üyeleri"
            description="Bu birimde kayıtlı personel, şube görevlileri ve kurum hesabı üyelikleri."
            actions={
              <div className="flex items-center gap-2">
                {members.length > 0 && (
                  <ExportCsvButton
                    name={`birim-${selected.code}-personel`}
                    headers={["Kullanıcı Kimliği", "Üyelik Türü", "Kaynak"]}
                    rows={filteredMembers.map((m) => [
                      m.subjectId,
                      m.isPrimary ? "Birincil Birim" : "Ek Birim",
                      m.source === "Directory" ? "Kurum Dizini" : "Elle Atanmış",
                    ])}
                  />
                )}
                {members.length > 3 && (
                  <div className="relative w-40 sm:w-56">
                    <Search
                      className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      type="search"
                      placeholder="Üye ara…"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="h-7.5 pl-7 text-xs rounded-lg"
                    />
                  </div>
                )}
              </div>
            }
          >
            {members.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  Bu birime atanmış üye yok
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aşağıdaki panelden personel ekleyebilir veya kurum dizini eşitlemesini
                  çalıştırabilirsiniz.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <caption className="sr-only">Birim üyeleri listesi</caption>
                  <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Kullanıcı
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Üyelik Türü
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Kaynak
                      </th>
                      {canManage && (
                        <th
                          scope="col"
                          className="px-4 py-2.5 text-right font-medium"
                        >
                          İşlem
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMembers.map((member) => {
                      const initialLetter = (
                        member.subjectId
                          .trim()
                          .replace(/[^\p{L}\p{N}]/gu, "")
                          .charAt(0) || "?"
                      ).toLocaleUpperCase("tr");

                      return (
                        <tr
                          key={member.id}
                          className="transition-colors hover:bg-muted/30"
                        >
                          <td className="max-w-xs px-4 py-3">
                            <span className="flex items-center gap-3">
                              <span
                                aria-hidden
                                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary"
                              >
                                {initialLetter}
                              </span>
                              <span
                                className="min-w-0 truncate font-medium text-foreground"
                                title={member.subjectId}
                              >
                                {member.subjectId}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {member.isPrimary ? (
                              <Badge
                                variant="outline"
                                className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium"
                              >
                                <Star
                                  className="size-3 fill-amber-500 text-amber-500"
                                  aria-hidden
                                />
                                Birincil birim
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Ek birim
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="secondary"
                              className="text-[11px] font-normal"
                            >
                              {member.source === "Directory"
                                ? "Kurum Dizini"
                                : "Elle Atanmış"}
                            </Badge>
                          </td>
                          {canManage && (
                            <td className="px-4 py-3 text-right">
                              <ActionForm
                                action={unitAction}
                                label="Üyeliği kaldır"
                              >
                                <Operation unit={selected} name="member-remove" />
                                <input
                                  type="hidden"
                                  name="subjectId"
                                  value={member.subjectId}
                                />
                              </ActionForm>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Member Add Card */}
            {canManage && selected.isActive && (
              <div className="border-t border-border bg-muted/20 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <UserPlus className="size-4 text-primary" />
                  <h3>Birime Yeni Üye Ata</h3>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Kurumsal kimlik sahibi bir kullanıcıyı doğrudan bu birime yetkilendirin.
                </p>

                <div className="mt-3.5 max-w-xl">
                  <ActionForm action={unitAction} label="Üyeyi Birime Ata">
                    <Operation unit={selected} name="member-add" />
                    <div className="space-y-3">
                      <div>
                        <Label
                          htmlFor="add-member-subject"
                          className="text-xs font-medium"
                        >
                          Kurumsal Kullanıcı Kimliği (Özne)
                        </Label>
                        <Input
                          id="add-member-subject"
                          name="subjectId"
                          required
                          className="mt-1 text-xs"
                          placeholder="ör. ad.soyad veya e-posta kimliği"
                        />
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          Kimlik sağlayıcıdaki değişmez hesap kimliği.
                        </span>
                      </div>

                      <label className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-background p-3 text-xs shadow-2xs cursor-pointer">
                        <input
                          type="checkbox"
                          name="isPrimary"
                          className="mt-0.5 rounded border-border"
                        />
                        <span>
                          <strong className="font-semibold text-foreground">
                            Kullanıcının Birincil Birimi Olsun
                          </strong>
                          <span className="mt-0.5 block text-muted-foreground font-normal">
                            Yeni belge, dosya ve tarama kayıtlarında varsayılan organizasyonel birim olarak atanır.
                          </span>
                        </span>
                      </label>
                    </div>
                  </ActionForm>
                </div>
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* TAB 2: SDP BAŞLIK EŞLEŞTİRMESİ */}
        <TabsContent value="plans" className="space-y-4">
          <Panel
            title="Standart Dosya Planı (SDP) Eşleştirmesi"
            description="Bu birimin arşiv işlemlerinde kullanabileceği dosya planı konu başlıkları."
            padded
          >
            <UnitPlanEditor
              key={selected.id}
              trees={trees}
              initial={details}
              disabled={!canManage || !selected.isActive}
            />
          </Panel>
        </TabsContent>

        {/* TAB 3: BİRİM AYARLARI & HİYERARŞİ */}
        <TabsContent value="settings" className="space-y-4">
          {canManage ? (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                {unitTypes.length > 0 && (
                  <Panel title="Teşkilat Seviyesi" padded>
                    <UnitTypePicker
                      unit={selected}
                      units={units}
                      unitTypes={unitTypes}
                    />
                  </Panel>
                )}

                {/* Rename Card */}
                <Panel title="Birim Bilgilerini Düzenle" padded id="birim-duzenle">
                  <ActionForm action={unitAction} label="Bilgileri Kaydet">
                    <Operation unit={selected} name="rename" />
                    <div className="space-y-3 text-xs">
                      <div>
                        <Label
                          htmlFor="unit-name-input"
                          className="text-xs font-medium"
                        >
                          Birim Adı
                        </Label>
                        <Input
                          id="unit-name-input"
                          name="name"
                          required
                          defaultValue={selected.name}
                          maxLength={300}
                          className="mt-1 text-xs"
                        />
                      </div>

                      <div>
                        <Label
                          htmlFor="unit-short-input"
                          className="text-xs font-medium"
                        >
                          Kısa Ad
                        </Label>
                        <Input
                          id="unit-short-input"
                          name="shortName"
                          defaultValue={selected.shortName ?? ""}
                          maxLength={40}
                          className="mt-1 text-xs"
                        />
                      </div>

                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">
                          Birim Kodu
                        </Label>
                        <Input
                          disabled
                          value={selected.code}
                          className="mt-1 bg-muted font-mono text-xs opacity-80"
                        />
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          Arşiv bütünlüğü sebebiyle birim kodu doğrudan değiştirilemez.
                        </span>
                      </div>
                    </div>
                  </ActionForm>
                </Panel>

                {/* Move Hierarchy Card */}
                <Panel title="Hiyerarşik Konum (Üst Birim Değiştir)" padded id="birim-tasi">
                  <ActionForm action={unitAction} label="Üst Birimi Güncelle">
                    <Operation unit={selected} name="move" />
                    <div className="space-y-3 text-xs">
                      <p className="text-muted-foreground">
                        Bu birimi ve bağlı tüm alt birimlerini başka bir üst birim altına
                        veya doğrudan en üst kök seviyesine taşıyabilirsiniz.
                      </p>

                      <div>
                        <Label
                          htmlFor="unit-parent-select"
                          className="text-xs font-medium"
                        >
                          Yeni Üst Birim
                        </Label>
                        <select
                          id="unit-parent-select"
                          name="parentId"
                          defaultValue={selected.parentId ?? ""}
                          className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="">🏢 Kök Birim (En Üst Düzey)</option>
                          {units
                            .filter(
                              (unit) =>
                                unit.isActive && !unit.path.startsWith(selected.path),
                            )
                            .map((unit) => (
                              <option key={unit.id} value={unit.id}>
                                {unit.name} ({unit.code})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="rounded border border-border/60 bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
                        Mevcut Yol: <code className="font-mono text-foreground">{selected.path}</code>
                      </div>
                    </div>
                  </ActionForm>
                </Panel>
              </div>

              {/* Danger Zone */}
              <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-5">
                <div className="flex items-center gap-2 text-destructive">
                  <ShieldAlert className="size-5" />
                  <h3 className="font-semibold text-sm">
                    Birim Yaşam Döngüsü ve Güvenlik
                  </h3>
                </div>

                <div className="mt-4 grid gap-6 xl:grid-cols-2">
                  <div id="birim-durum" className="rounded-lg border border-border bg-background p-4 shadow-2xs">
                    <h4 className="text-xs font-semibold text-foreground">
                      {selected.isActive ? "Birimi Pasifleştir" : "Birimi Etkinleştir"}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Pasif birimin geçmiş arşivi, belgeleri ve kütükleri korunur;
                      ancak yeni kayıt açılamaz. Alt birimlerin durumu bağımsız yönetilir.
                    </p>
                    <div className="mt-3">
                      <ActionForm
                        action={unitAction}
                        label={selected.isActive ? "Birimi Pasifleştir" : "Birimi Yeniden Etkinleştir"}
                      >
                        <Operation unit={selected} name="active" />
                        <input
                          type="hidden"
                          name="isActive"
                          value={String(!selected.isActive)}
                        />
                      </ActionForm>
                    </div>
                  </div>

                  <div id="birim-sil" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                    <h4 className="text-xs font-semibold text-destructive">
                      Birimi Tamamen Kaldır (Sil)
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Yalnızca hiçbir alt birimi, kayıtlı üyesi, belgesi veya dosyası
                      bulunmayan boş birimler silinebilir.
                    </p>
                    <div className="mt-3">
                      <ActionForm action={unitAction} label="Birimi Kalıcı Olarak Sil">
                        <Operation unit={selected} name="delete" />
                        <label className="flex items-start gap-2 text-xs cursor-pointer py-1">
                          <input
                            type="checkbox"
                            name="confirm"
                            required
                            className="mt-0.5 rounded border-destructive/50"
                          />
                          <span>
                            <strong>{selected.name}</strong> birimini ve kaydını
                            kaldırmayı onaylıyorum.
                          </span>
                        </label>
                      </ActionForm>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <Panel padded>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="size-4" />
                <span>Birim ayarlarını değiştirmek için organizasyon yönetimi yetkisi gerekir.</span>
              </div>
            </Panel>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Operation({ unit, name }: { unit: OrganizationUnit; name: string }) {
  return (
    <>
      <input type="hidden" name="unitId" value={unit.id} />
      <input type="hidden" name="operation" value={name} />
    </>
  );
}

/**
 * Birimin teşkilat seviyesini değiştirir.
 *
 * <para>
 * Seçenekler üst birimin kademesine göre süzülür: alt birim, üstünden daha
 * derin bir seviyede olmalıdır. Üst birimin seviyesi atanmamışsa kural
 * uygulanmaz, çünkü ağacı yukarıdan aşağı doldurmak mümkün olmalıdır.
 * </para>
 */
function UnitTypePicker({ unit, units, unitTypes }: {
  unit: OrganizationUnit;
  units: OrganizationUnit[];
  unitTypes: UnitTypeItem[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const parentType = unitTypes.find(
    type => type.code === units.find(candidate => candidate.id === unit.parentId)?.typeCode,
  );
  const selectable = unitTypes.filter(
    type => type.isActive && (!parentType || parentType.allowedChildCodes.includes(type.code)),
  );
  const current = unitTypes.find(type => type.code === unit.typeCode);

  // Pasife alınmış ya da kademe kuralına uymayan mevcut seviye listede
  // görünmeli; aksi hâlde kaydetmeden önce sessizce başka bir değere kayardı.
  const options = current && !selectable.some(type => type.code === current.code)
    ? [current, ...selectable]
    : selectable;

  async function change(typeCode: string) {
    if (pending) return;
    setPending(true); setError("");
    const result = await setUnitTypeAction(unit.id, typeCode || null);
    setPending(false);
    if (result.error) { setError(result.error); return; }
    toast.success("Birim seviyesi güncellendi.");
    router.refresh();
  }

  return <div className="space-y-2 text-xs">
    <select
      aria-label="Teşkilat seviyesi"
      value={unit.typeCode ?? ""}
      disabled={pending}
      onChange={event => void change(event.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <option value="">Belirtilmedi</option>
      {options.map(type => (
        <option key={type.code} value={type.code}>
          {type.name}{type.isActive ? "" : " (pasif)"}
        </option>
      ))}
    </select>
    <p className="leading-5 text-muted-foreground">
      {parentType
        ? `Üst birim “${parentType.name}” olduğu için yalnız daha alt kademeler seçilebilir.`
        : "Üst birimin seviyesi atanmadığı için tüm kademeler açık."}
      {current && !current.canHoldMembers && " Bu seviye yalnız hiyerarşi taşır; personel alt birimlere bağlanmalıdır."}
    </p>
    {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-2 text-destructive">{error}</p>}
  </div>;
}
