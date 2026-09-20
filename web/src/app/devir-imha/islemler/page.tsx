import Link from "next/link";
import { PageHeader } from "@/components/ui/page";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getDispositions } from "@/features/retention/api/get-dispositions";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { canOperate } from "@/features/retention/model/process-permissions";
import { DispositionsListView } from "@/features/retention/components/dispositions-list-view";
import { Plus, ArrowLeft } from "lucide-react";

export const metadata = { title: "Komisyon ve Devir İşlemleri · MBB Dijital Arşiv" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [result, user] = await Promise.all([
    getDispositions(1, ""),
    getCurrentUser(),
  ]);

  const canPrepare = canOperate(user, "retention.disposition.prepare");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Komisyon ve Devir İşlemleri"
        description="Tasfiye taslaklarını inceleyin, komisyon görüşlerini bildirin ve resmi onayları takip edin."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/devir-imha"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5 text-xs")}
            >
              <ArrowLeft className="size-3.5" />
              <span>Saklama Dosyalarına Dön</span>
            </Link>
            {canPrepare && (
              <Link
                href="/devir-imha/yeni"
                className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-1.5 text-xs font-medium")}
              >
                <Plus className="size-3.5" />
                <span>Yeni Değerlendirme</span>
              </Link>
            )}
          </div>
        }
      />

      <DispositionsListView items={result.items} canPrepare={canPrepare} />
    </div>
  );
}
