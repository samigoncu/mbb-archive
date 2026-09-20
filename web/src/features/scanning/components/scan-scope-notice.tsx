import Link from "next/link";
import { FileWarning } from "lucide-react";
import { EmptyState, Panel } from "@/components/ui/page";
import type { DigitalDossier } from "@/features/dossiers/model/dossier";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import { folderStatusLabels } from "@/features/physical-archive/model/folder";
import type { ScanContext } from "../model/scan-context";

/**
 * Klasör ya da dijital dosya tarama kapsamına girmediğinde gösterilir.
 *
 * <para>
 * Önceden bu durumda sayfa boş bir 404 veriyordu: kullanıcı ne olduğunu ya da
 * ne yapması gerektiğini göremiyordu. En sık sebep, dosyanın yürürlükten
 * kalkmış bir SDP sürümüne bağlı olmasıdır.
 * </para>
 */
export function scanScopeProblem(
  context: ScanContext,
  folder: FolderListItem | null,
  dossier: DigitalDossier | null,
): { title: string; description: string; action?: { href: string; label: string } } | null {
  if (folder && !context.folders.some(item => item.id === folder.id)) {
    if (folder.status !== "Available") {
      return {
        title: "Bu klasöre şu anda tarama yapılamaz",
        description: `${folder.barcode} · ${folder.title} klasörü "${folderStatusLabels[folder.status] ?? folder.status}" durumunda. Ödünçteki, devredilmiş veya imha edilmiş klasöre belge bağlanamaz.`,
        action: { href: "/dosya-islemleri", label: "Fiziksel dosyalara dön" },
      };
    }
    if (!context.classifications.some(item => item.code === folder.filePlanCode)) {
      return {
        title: "Klasörün dosya planı konusu yürürlükte değil",
        description: `${folder.barcode} klasörü ${folder.filePlanCode} kodunu kullanıyor; bu konu birime atanmamış ya da bağlı olduğu SDP sürümü yürürlükten kalkmış. Tarama yalnız yürürlükteki konularda yapılabilir.`,
        action: { href: "/tanimlamalar/birimler", label: "Birim–SDP eşleştirmesini aç" },
      };
    }
    return {
      title: "Klasör tarama kapsamınızda değil",
      description: `${folder.barcode} klasörü yetkili olduğunuz birime ait görünmüyor. Birim seçiminizi ve yetkilerinizi kontrol edin.`,
      action: { href: "/dosya-islemleri", label: "Fiziksel dosyalara dön" },
    };
  }

  if (dossier && !context.dossiers.some(item => item.id === dossier.id)) {
    return {
      title: "Dijital dosyanın SDP sürümü yürürlükte değil",
      description: `"${dossier.title}" dosyası ${dossier.filePlanCode} · ${dossier.filePlanVersion} sürümüne bağlı. Bu sürüm yürürlükten kalktığı ya da konu birime atanmadığı için dosya tarama kapsamına girmiyor. Dosyayı yürürlükteki bir konuya taşıdıktan sonra tarama yapabilirsiniz.`,
      action: { href: `/documents?ownerUnitId=${encodeURIComponent(dossier.ownerUnitId)}`, label: "Dijital dosyaları yönet" },
    };
  }

  return null;
}

export function ScanScopeNotice({ problem }: { problem: NonNullable<ReturnType<typeof scanScopeProblem>> }) {
  return <Panel>
    <EmptyState icon={FileWarning} title={problem.title} description={problem.description} />
    <div className="flex flex-wrap justify-center gap-3 px-6 pb-6">
      {problem.action && <Link href={problem.action.href} className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">{problem.action.label}</Link>}
      <Link href="/tarama" className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted">Klasörsüz tarama başlat</Link>
    </div>
  </Panel>;
}
