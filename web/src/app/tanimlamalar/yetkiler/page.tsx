import Link from "next/link";
import { Users, ShieldCheck, Building2, Eye } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api/api-client";
import { PageHeader } from "@/components/ui/page";
import { Input } from "@/components/ui/input";
import { UserAdministration } from "@/features/access/components/user-administration";
import { RoleAdministration } from "@/features/access/components/role-administration";
import type { OrganizationUnit } from "@/features/organization/model/unit-plans";
import { listDirectoryUsers, type DirectoryUserPage } from "@/features/organization/api/directory-users";
import type { ManagedRole, ManagedSubject } from "@/features/access/model/administration";
import UnitsPage from "../birimler/page";
import VisibilityPage from "../gorunurluk/page";
export const metadata = { title: "Kullanıcı ve Yetki Yönetimi" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const params = await searchParams;
  const tab = ["users","roles","units","visibility"].includes(params.tab ?? "") ? params.tab! : "users";
  const roles = await apiGet<ManagedRole[]>("/access/administration/roles", { cache: "no-store" });
  const base = "/tanimlamalar/yetkiler";
  const page = Math.max(1, Number.parseInt(params.page ?? "1",10) || 1);
  const search = params.search ?? "";
  // Yetkisi olmayanı da gösteren süzgeç: künyesi olup hiç rolü olmayanlar.
  const pendingOnly = params.durum === "bekleyen";
  const [catalog, directoryUsers, units] = await Promise.all([
    tab === "roles" ? apiGet<string[]>("/access/permissions", { cache: "no-store" }) : Promise.resolve([]),
    tab === "users"
      ? listDirectoryUsers(search)
      : Promise.resolve<DirectoryUserPage>({ users: [], hasMore: false, unavailable: false }),
    tab === "users" ? apiGet<OrganizationUnit[]>("/organization/units", { cache: "no-store" }).catch(() => []) : Promise.resolve([]),
  ]);
  // Künye listesi, rol atanmamış kişileri de listeye taşır: giriş yapmış ama
  // henüz yetkilendirilmemiş kullanıcı aksi hâlde hiçbir ekranda görünmezdi.
  const subjects = tab === "users"
    ? await apiPost<{search:string;page:number;include:string[];onlyPending:boolean}, {items:ManagedSubject[];totalCount:number}>(
        "/access/subjects/search",
        { search, page, include: directoryUsers.users.map(user => user.subjectId), onlyPending: pendingOnly },
        { cache: "no-store" } as RequestInit)
    : { items: [], totalCount: 0 };
  return <div className="space-y-5">
    <PageHeader title="Kullanıcı ve Yetki Yönetimi" description="Kullanıcı rol atamalarını, modül izinlerini ve birim kapsamını tek merkezden yönetin." />
    <nav aria-label="Kullanıcı yönetimi sekmeleri" className="flex flex-wrap gap-2 border-b border-border pb-3">{[{key:"users",label:"Kullanıcılar",Icon:Users},{key:"roles",label:"Roller ve izinler",Icon:ShieldCheck},{key:"units",label:"Birimler ve üyelikler",Icon:Building2},{key:"visibility",label:"Erişim denetimi",Icon:Eye}].map(({key,label,Icon}) => <Link key={key} href={`${base}?tab=${key}`} aria-current={tab === key ? "page" : undefined} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${tab === key ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}><Icon className="size-4" aria-hidden />{label}</Link>)}</nav>
    {tab === "units" && <UnitsPage searchParams={Promise.resolve(params)} />}
    {tab === "visibility" && <VisibilityPage searchParams={Promise.resolve(params)} />}
    {tab === "roles" && <RoleAdministration roles={roles} catalog={catalog} />}
    {tab === "users" && <UserAdministration
      base={base}
      roles={roles}
      units={units}
      subjects={subjects}
      directory={directoryUsers.users}
      directoryTruncated={directoryUsers.hasMore}
      directoryError={directoryUsers.error}
      search={search}
      pendingOnly={pendingOnly}
      page={page}
    />}
  </div>;
}
