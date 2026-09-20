import { DirectoryPanel } from "@/features/organization/components/directory-panel";
import { UnitTreeNav } from "@/features/organization/components/unit-tree-nav";
import { CreateUnitDialog } from "@/features/organization/components/create-unit-dialog";
import { UnitDetailWorkspace } from "@/features/organization/components/unit-detail-workspace";
import { OrganizationStatsOverview } from "@/features/organization/components/organization-stats-overview";
import { apiGet } from "@/lib/api/api-client";
import { EmptyState, PageHeader, Panel } from "@/components/ui/page";
import { getFilePlans, getFilePlanTree } from "@/features/classification/api/get-classification";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { getUnitPlanDetails } from "@/features/organization/api/unit-plans";
import { getUnitTypes } from "@/features/organization/api/get-unit-types";
import type { OrganizationUnit, UnitMember } from "@/features/organization/model/unit-plans";
import type { FilePlanTree } from "@/features/classification/model/classification";
import { Building2, FolderTree } from "lucide-react";

export const metadata = { title: "Birim Yönetimi · MBB Arşiv" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const managementHub = params.tab === "units";
  const basePath = managementHub
    ? "/tanimlamalar/yetkiler?tab=units&"
    : "/tanimlamalar/birimler?";

  const [units, plans, user, unitTypes, directoryStatus] = await Promise.all([
    apiGet<OrganizationUnit[]>("/organization/units?includeInactive=true", {
      cache: "no-store",
    }),
    getFilePlans(),
    getCurrentUser(),
    getUnitTypes(),
    apiGet<{ userSyncConfigured: boolean; unitSyncConfigured: boolean }>(
      "/organization/directory/status",
      { cache: "no-store" },
    ).catch(() => ({ userSyncConfigured: false, unitSyncConfigured: false })),
  ]);

  const selected = units.find((unit) => unit.id === params.unitId) ?? units[0];
  const canManage =
    !!user &&
    (user.isBootstrapAdministrator ||
      user.permissions.includes("organization.manage"));

  const [details, members, trees] = await Promise.all([
    selected ? getUnitPlanDetails(selected.id) : Promise.resolve(null),
    selected
      ? apiGet<UnitMember[]>(`/organization/units/${selected.id}/members`, {
          cache: "no-store",
        })
      : Promise.resolve([]),
    Promise.all(
      plans
        .filter((plan) => plan.isActive)
        .map((plan) => getFilePlanTree(plan.id)),
    ),
  ]);

  const activeUnitsCount = units.filter((u) => u.isActive).length;
  const totalMembersCount = units.reduce((sum, u) => sum + (u.memberCount || 0), 0);
  const assignedPlansCount = details?.items.length ?? 0;
  const directoryConfigured = directoryStatus.unitSyncConfigured || directoryStatus.userSyncConfigured;

  return (
    <div className="flex flex-col gap-5">
      {/* Show PageHeader only on standalone /tanimlamalar/birimler page;
          if accessed inside /tanimlamalar/yetkiler?tab=units, outer page header is already present. */}
      {!managementHub && (
        <PageHeader
          title="Birim ve Organizasyon Yönetimi"
          description="Kurum teşkilat yapısını, hiyerarşik birim ağacını, personel üyeliklerini ve SDP konu eşleştirmelerini yönetin."
          actions={
            canManage ? (
              <CreateUnitDialog units={units} unitTypes={unitTypes} defaultParentId={selected?.id} />
            ) : undefined
          }
        />
      )}

      {/* Corporate Teşkilat KPI Özet Kartları */}
      <OrganizationStatsOverview
        totalUnits={units.length}
        activeUnits={activeUnitsCount}
        totalMembers={totalMembersCount}
        unitTypesCount={unitTypes.length}
        assignedPlansCount={assignedPlansCount}
        directoryConfigured={directoryConfigured}
      />

      {/* Directory Synchronization Panel */}
      {canManage && <DirectoryPanel />}

      {/* Main 2-Column Organization Workspace */}
      <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left Column: Organization Tree & Create Action */}
        <div className="flex flex-col gap-4">
          <Panel
            title="Kurum Teşkilat Şeması"
            description={`${units.length} birim kayıtlı · ${activeUnitsCount} aktif`}
            actions={
              canManage ? (
                <CreateUnitDialog units={units} unitTypes={unitTypes} defaultParentId={selected?.id} />
              ) : undefined
            }
            padded
          >
            <UnitTreeNav
              units={units}
              selectedId={selected?.id}
              basePath={basePath}
            />
          </Panel>
        </div>

        {/* Right Column: Selected Unit Detail Workspace */}
        {selected && details ? (
          <UnitDetailWorkspace
            key={selected.id}
            selected={selected}
            details={details}
            members={members}
            units={units}
            unitTypes={unitTypes}
            trees={trees.filter((tree): tree is FilePlanTree => tree !== null)}
            canManage={canManage}
            basePath={basePath}
          />
        ) : (
          <Panel padded className="py-12">
            <EmptyState
              icon={Building2}
              title="Yönetmek için bir birim seçin"
              description="Sol taraftaki teşkilat ağacından bir birim seçerek bilgilerini, üyelerini ve SDP eşleştirmelerini görüntüleyebilirsiniz."
              action={
                canManage ? (
                  <CreateUnitDialog units={units} unitTypes={unitTypes} />
                ) : undefined
              }
            />
          </Panel>
        )}
      </div>
    </div>
  );
}
