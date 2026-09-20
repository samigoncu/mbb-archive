"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlanTreeView } from "./file-plan-tree";
import { Panel, EmptyState } from "@/components/ui/page";
import { Input } from "@/components/ui/input";
import { CreateFilePlanDialog } from "./create-file-plan-dialog";
import { AddFilePlanNodeDialog } from "./add-file-plan-node-dialog";
import { ExportCsvButton } from "@/components/export-csv-button";
import type { FilePlanListItem, FilePlanTree } from "../model/classification";
export function FilePlanManager({
  initialPlans,
  initialTree,
}: {
  initialPlans: FilePlanListItem[];
  initialTree: FilePlanTree | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const nodes = initialTree?.items ?? [];
  const filtered = nodes.filter((n) =>
    `${n.code} ${n.title}`
      .toLocaleLowerCase("tr-TR")
      .includes(search.toLocaleLowerCase("tr-TR")),
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label>
          Dosya planı
          <select
            value={initialTree?.id ?? ""}
            onChange={(e) =>
              router.push(`/tanimlamalar?plan=${e.target.value}`)
            }
            className="ml-2 rounded border p-2"
          >
            <option value="" disabled>
              Plan seçin
            </option>
            {initialPlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {p.name} · {p.version}
              </option>
            ))}
          </select>
        </label>
        <CreateFilePlanDialog
          onPlanCreated={(p) => {
            router.push(`/tanimlamalar?plan=${p.id}`);
            router.refresh();
          }}
        />
      </div>
      {initialTree ? (
        <Panel
          title={`${initialTree.name} · ${initialTree.version}`}
          padded
          actions={
            <AddFilePlanNodeDialog
              planId={initialTree.id}
              nodes={nodes}
              onNodeAdded={() => router.refresh()}
            />
          }
        >
          <p className="mb-3 text-sm">
            Yetkili kurum: {initialTree.authority} · Yürürlük:{" "}
            {initialTree.effectiveFrom} –{" "}
            {initialTree.effectiveTo ?? "devam ediyor"} · {nodes.length} başlık
          </p>
          <p className="mb-3 text-sm text-muted-foreground">Bu ekran ana kataloğu gösterir. Dosyalama ekranlarında biriminize atanmış kodlar görünür; atamalar Tanımlamalar → Birimler üzerinden yönetilir.</p>
          <div className="mb-3 flex flex-wrap gap-3">
            <Input
              aria-label="Dosya planında ara"
              placeholder="Kod veya başlık ara"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <ExportCsvButton
              name="dosya-plani"
              headers={[
                "Kod",
                "Başlık",
                "Üst kod",
                "Seviye",
                "Seçilebilir",
                "Aktif",
              ]}
              rows={filtered.map((n) => [
                n.code,
                n.title,
                nodes.find((p) => p.id === n.parentId)?.code ?? "",
                n.level,
                n.isSelectable ? "Evet" : "Hayır",
                n.isActive ? "Evet" : "Hayır",
              ])}
            />
          </div>
          {!filtered.length ? (
            <EmptyState title="Dosya planında kod bulunamadı" />
          ) : (
            <FilePlanTreeView
              nodes={nodes}
              name={`${initialTree.name} · ${initialTree.version}`}
              search={search}
              planId={initialTree.id}
              canManage
              onChanged={() => router.refresh()}
            />
          )}
        </Panel>
      ) : (
        <EmptyState
          title="Henüz dosya planı yok"
          description="Yetkili kurumun dosya planını yeni bir sürüm olarak oluşturun."
        />
      )}
    </div>
  );
}
