import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { getUnitTypes } from "@/features/organization/api/get-unit-types";
import { UnitTypeManager } from "@/features/organization/components/unit-type-manager";

export const metadata = { title: "Birim Seviyeleri" };

export default async function BirimSeviyeleriPage() {
  const [types, user] = await Promise.all([getUnitTypes(), getCurrentUser()]);
  const canManage =
    !!user && (user.isBootstrapAdministrator || user.permissions.includes("organization.manage"));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Birim Seviyeleri"
        description="Kurumun teşkilat kalıbı: daire başkanlığı, şube müdürlüğü, servis gibi kademeleri tanımlayın."
        actions={
          <Link
            href="/tanimlamalar/birimler"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Birimleri aç
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        }
      />

      <UnitTypeManager types={types} canManage={canManage} />

      <p className="text-xs leading-5 text-muted-foreground">
        Seviyeler yalnız kalıbı belirler; asıl birimleri Birimler ekranından tanımlarsınız.
        Seviye ataması zorunlu değildir — kataloğa geçmeden önce açılmış birimler seviyesiz
        kalabilir ve sonradan atanır.
      </p>
    </div>
  );
}
