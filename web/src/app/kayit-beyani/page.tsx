import { getLinkedDocuments } from "@/features/documents/api/get-linked-documents";
import Link from "next/link";
import { Gavel } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/page";
import { buttonVariants } from "@/components/ui/button";
import { getArchiveRecords } from "@/features/archive/api/get-archive-records";
import { ArchiveRecordTable } from "@/features/archive/components/archive-record-table";
import {
  getFilePlans,
  getFilePlanTree,
} from "@/features/classification/api/get-classification";
import { getRetentionRules } from "@/features/retention/api/get-retention";
import type { FilePlanNode } from "@/features/classification/model/classification";

export const metadata = { title: "Kayıt Beyanı" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const statusTabs = [
  { value: "", label: "Tümü" },
  { value: "Candidate", label: "Beyan bekleyen" },
  { value: "Declared", label: "Beyan edilmiş" },
];

/** Yalnız seçilebilir kalemler beyanda kullanılabilir; ara başlıklar kullanılamaz. */
async function loadSelectableFilePlanItems(): Promise<FilePlanNode[]> {
  const plans = await getFilePlans();
  const trees = await Promise.all(plans.map((plan) => getFilePlanTree(plan.id)));

  return trees
    .flatMap((tree) => tree?.items ?? [])
    .filter((item) => item.isSelectable && item.isActive)
    .sort((a, b) => a.code.localeCompare(b.code, "tr"));
}

export default async function KayitBeyaniPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.status) ? params.status[0] : params.status;
  const status = raw === "Candidate" || raw === "Declared" ? raw : undefined;

  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const [records, filePlanItems, retentionRules] = await Promise.all([
    getArchiveRecords(page, status, 50),
    loadSelectableFilePlanItems(),
    getRetentionRules().catch(() => []),
  ]);

  const linked = await getLinkedDocuments([...new Set(records.items.map(record => record.documentId))]);
  const documentTitles = Object.fromEntries(linked.map(document => [document.id, document.details?.title ?? "Belgeye erişilemiyor"]));
  const lastPage = Math.max(1, Math.ceil(records.totalCount / 50));
  const href = (next: number) => `/kayit-beyani?${new URLSearchParams({ page: String(next), status: status ?? "" })}`;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Kayıt Beyanı"
        description="Orijinali saklanan her belge sürümü aday kayıt olarak açılır. Beyan, kaydı değişmez hâle getirir ve saklama takvimini başlatır."
      />

      <Notice icon={Gavel}>
        Bir kayıt beyan edildiğinde sınıflandırma ve saklama kuralı SHA-256
        özetiyle birlikte sabitlenir. Beyan geri alınamaz; düzeltme gerekiyorsa
        belgeye yeni sürüm eklenir.
      </Notice>

      <nav aria-label="Beyan durumu" className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        {statusTabs.map((tab) => (
          <Link
            aria-current={(status ?? "") === tab.value ? "page" : undefined}
            key={tab.value || "all"}
            href={
              tab.value ? `/kayit-beyani?status=${tab.value}` : "/kayit-beyani"
            }
            className={buttonVariants({
              size: "sm",
              variant: (status ?? "") === tab.value ? "default" : "outline",
            })}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <ArchiveRecordTable
        records={records.items}
        documentTitles={documentTitles}
        totalCount={records.totalCount}
        filePlanItems={filePlanItems}
        retentionRules={retentionRules}
      />
      <nav aria-label="Beyan kayıtları sayfaları" className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Sayfa {page} / {lastPage}</span><div className="flex gap-4">{page > 1 && <Link href={href(page-1)}>Önceki</Link>}{page < lastPage && <Link href={href(page+1)}>Sonraki</Link>}</div></nav>
    </div>
  );
}
