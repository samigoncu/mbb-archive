import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Notice, PageHeader, Panel } from "@/components/ui/page";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { getResourceGrants } from "@/features/access/api/get-grants";
import { grantAction } from "@/features/access/api/grant-actions";
import {
  grantPermissions,
  grantResourceTypes,
  grantSubjectTypes,
  permissionLabels,
  resourceKeyHints,
  resourceTypeLabels,
  subjectTypeLabels,
  type AccessGrant,
} from "@/features/access/model/grants";

export const metadata = { title: "Paylaşımlar" };

/**
 * Birim sınırını aşan istisnaların yönetimi. Normal kural birim kapsamıdır:
 * bir birimin evrakını başka birim görmez. Buradaki kayıtlar o kuralın
 * bilinçli istisnalarıdır ve kim, neyi, kime, hangi gerekçeyle açtı sorusu
 * her satırda okunabilir olmalıdır.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ resourceType?: string; resourceKey?: string }>;
}) {
  const params = await searchParams;
  const resourceType = params.resourceType ?? "Document";
  const resourceKey = params.resourceKey?.trim() ?? "";

  const user = await getCurrentUser();
  const canManage =
    !!user &&
    (user.isBootstrapAdministrator ||
      user.permissions.includes("access.grants.manage"));

  let grants: AccessGrant[] = [];
  let lookupError: string | null = null;

  if (resourceKey) {
    try {
      grants = await getResourceGrants(resourceType, resourceKey);
    } catch {
      lookupError =
        "Paylaşımlar okunamadı. Kaynak türü ve anahtarın doğru olduğundan emin olun.";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Paylaşımlar"
        description="Bir belgeyi, dosya planı dalını veya klasörü sahibi birimin dışına açar. Kapsam kuralı korunur; bu kayıtlar onun istisnasıdır."
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Kaynağa verilmiş paylaşımlar" padded>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <label className="text-sm">
              Kaynak türü
              <select
                name="resourceType"
                defaultValue={resourceType}
                className="mt-1 block w-full rounded border bg-background p-2 text-sm"
              >
                {grantResourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {resourceTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-[16rem] flex-1 text-sm">
              Kaynak anahtarı
              <Input name="resourceKey" defaultValue={resourceKey} className="mt-1" />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Listele
            </button>
          </form>

          {lookupError && <Notice>{lookupError}</Notice>}

          {!resourceKey && (
            <p className="mt-4 text-sm text-muted-foreground">
              Bir kaynak anahtarı girin. Belge, koleksiyon ve klasör için kimlik
              (GUID), dosya planı için kod (örn. 903.01) beklenir.
            </p>
          )}

          {resourceKey && !lookupError && grants.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">
              Bu kaynağa verilmiş paylaşım yok. Yalnız sahibi birim ve üst
              birimleri görüyor.
            </p>
          )}

          {grants.length > 0 && (
            <ul className="mt-4 divide-y">
              {grants.map((grant) => (
                <li key={grant.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">
                      {label(subjectTypeLabels, grant.subjectType)}: {grant.subjectKey}
                      {" · "}
                      {label(permissionLabels, grant.permission)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {grant.isActive ? "Açık" : "Kapalı"}
                      {" · veren: "}
                      {grant.grantedBy}
                      {" · "}
                      {new Date(grant.createdAt).toLocaleString("tr-TR")}
                      {grant.validTo
                        ? ` · bitiş: ${new Date(grant.validTo).toLocaleDateString("tr-TR")}`
                        : " · süresiz"}
                    </p>
                    {grant.reason && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Gerekçe: {grant.reason}
                      </p>
                    )}
                  </div>
                  {canManage && grant.isActive && (
                    <ActionForm action={grantAction} label="Kaldır">
                      <input type="hidden" name="operation" value="revoke" />
                      <input type="hidden" name="id" value={grant.id} />
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {canManage ? (
          <Panel title="Yeni paylaşım" padded>
            <ActionForm action={grantAction} label="Paylaşımı ver">
              <input type="hidden" name="operation" value="create" />
              <label className="text-sm">
                Kaynak türü
                <select
                  name="resourceType"
                  defaultValue={resourceType}
                  className="mt-1 block w-full rounded border bg-background p-2 text-sm"
                >
                  {grantResourceTypes.map((type) => (
                    <option key={type} value={type}>
                      {resourceTypeLabels[type]} — {resourceKeyHints[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Kaynak anahtarı
                <Input name="resourceKey" defaultValue={resourceKey} required />
              </label>
              <label className="text-sm">
                Kime
                <select
                  name="subjectType"
                  className="mt-1 block w-full rounded border bg-background p-2 text-sm"
                >
                  {grantSubjectTypes.map((type) => (
                    <option key={type} value={type}>
                      {subjectTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Kullanıcı / grup / birim kimliği
                <Input name="subjectKey" required />
              </label>
              <label className="text-sm">
                İzin
                <select
                  name="permission"
                  className="mt-1 block w-full rounded border bg-background p-2 text-sm"
                >
                  {grantPermissions.map((permission) => (
                    <option key={permission} value={permission}>
                      {permissionLabels[permission]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Bitiş tarihi (isteğe bağlı)
                <Input type="date" name="validTo" />
              </label>
              <label className="text-sm">
                Gerekçe
                <Input name="reason" maxLength={500} />
              </label>
              <p className="text-xs text-muted-foreground">
                Kaldırılan paylaşım silinmez, kapalı olarak saklanır; denetimde
                kimin neyi ne zaman açtığı görülebilir.
              </p>
            </ActionForm>
          </Panel>
        ) : (
          <Panel padded>
            <p className="text-sm text-muted-foreground">
              Paylaşım vermek için <code>access.grants.manage</code> izni gerekir.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}

/** Sunucudan gelen enum değerini Türkçeleştirir; bilinmeyen değer olduğu gibi kalır. */
function label(map: Record<string, string>, value: string): string {
  return map[value] ?? value;
}
