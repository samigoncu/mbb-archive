import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader, Panel, Notice } from "@/components/ui/page";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { loadMalatyaApiSettingsAction } from "@/features/organization/api/malatya-api-actions";
import { MalatyaApiPanel } from "@/features/organization/components/malatya-api-panel";

export const metadata = { title: "API Entegrasyonu" };

export default async function Page() {
  const user = await getCurrentUser();
  const canManage =
    !!user && (user.isBootstrapAdministrator || user.permissions.includes("organization.manage"));
  const settings = canManage ? (await loadMalatyaApiSettingsAction()).data ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="API Entegrasyonu"
        description="API servisleri: Token alma, OTP/Normal SMS gönderimi ve Dizin geçiş yönetimi."
        actions={
          <Link
            href="/tanimlamalar/ldap"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            LDAP dizin ayarlarını aç
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        }
      />

      {!canManage ? (
        <Notice>API entegrasyonunu yalnız `organization.manage` yetkisi olan kullanıcı görüntüleyebilir.</Notice>
      ) : (
        <Panel title="API Servisleri ve Ayarları" description="Değişiklikler anında etkinleşir; yeniden başlatma gerektirmez." padded>
          <MalatyaApiPanel initial={settings} canManage={canManage} />
        </Panel>
      )}
    </div>
  );
}

