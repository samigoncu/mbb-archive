import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader, Panel, Notice } from "@/components/ui/page";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { loadDirectorySettingsAction } from "@/features/organization/api/directory-settings-actions";
import { DirectorySettingsPanel } from "@/features/organization/components/directory-settings-panel";
import { DirectoryPanel } from "@/features/organization/components/directory-panel";

export const metadata = { title: "LDAP Dizin Entegrasyonu" };

export default async function Page() {
  const user = await getCurrentUser();
  const canManage =
    !!user && (user.isBootstrapAdministrator || user.permissions.includes("organization.manage"));
  const settings = canManage ? (await loadDirectorySettingsAction()).data ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="LDAP Dizin Entegrasyonu"
        description="Kurum dizinine bağlanın; birimleri ve kullanıcı künyelerini uygulamaya aktarın."
        actions={
          <Link
            href="/tanimlamalar/birimler"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Birim yönetimini aç
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        }
      />

      {!canManage ? (
        <Notice>Dizin entegrasyonunu yalnız `organization.manage` yetkisi olan kullanıcı görüntüleyebilir.</Notice>
      ) : (
        <>
          <Panel title="Bağlantı ayarları" description="Değişiklik yeniden başlatma gerektirmez." padded>
            <DirectorySettingsPanel initial={settings} canManage={canManage} />
          </Panel>

          <DirectoryPanel />
        </>
      )}
    </div>
  );
}
