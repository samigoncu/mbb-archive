import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { getLocationTypes } from "@/features/physical-archive/api/get-location-types";
import { LocationTypeManager } from "@/features/physical-archive/components/location-type-manager";

export const metadata = { title: "Arşiv Yerleşim Seviyeleri" };

export default async function YerlesimSeviyeleriPage() {
  const [types, user] = await Promise.all([getLocationTypes(), getCurrentUser()]);
  const canManage =
    !!user && (user.isBootstrapAdministrator || user.permissions.includes("physical-archive.manage"));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Arşiv Yerleşim Seviyeleri"
        description="Fiziksel arşivin kalıbı: bina, oda, dolap, raf gibi seviyeleri tanımlayın ve sıralayın."
        actions={
          <Link
            href="/arsiv-yerlesimi"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Arşiv yerleşimini aç
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        }
      />

      <LocationTypeManager types={types} canManage={canManage} />

      <p className="text-xs leading-5 text-muted-foreground">
        Seviyeler yalnız kalıbı belirler; asıl bina, oda ve rafları Arşiv
        Yerleşimi ekranından tanımlarsınız. Bir konum, yalnız kendisinden daha
        sığ bir konumun altına açılabilir — ara seviye atlamak serbesttir.
      </p>
    </div>
  );
}
