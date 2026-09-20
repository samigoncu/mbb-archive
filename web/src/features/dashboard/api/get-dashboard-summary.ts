import {
  getDashboardData,
  measurement,
} from "@/features/dashboard/api/get-dashboard";
import { getDocuments } from "@/features/documents/api/get-documents";
import type {
  DocumentListItem,
  PagedResult,
} from "@/features/documents/model/document";
import {
  countFolders,
  getFolders,
} from "@/features/physical-archive/api/get-folders";
import { getLocationOccupancy } from "@/features/physical-archive/api/get-occupancy";
import type { LocationOccupancyItem } from "@/features/physical-archive/api/get-occupancy";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import { countLoans } from "@/features/loans/api/get-loans";
import { whenPermitted } from "@/lib/api/when-permitted";

/**
 * Listeler CreatedAt'e göre azalan sırada döner; son kayıt örneklemi bu kadar
 * satırla sınırlıdır. Pencere içindeki kayıt sayısı örneklemi doldurursa
 * `isPartial` ile "en az" olduğu işaretlenir, tahmini değer üretilmez.
 */
const RECENT_SAMPLE_SIZE = 100;

export type WindowedCount = {
  count: number;
  /** Örneklem dolduğu için gerçek sayı daha yüksek olabilir. */
  isPartial: boolean;
};

export type DashboardSummary = {
  documents: {
    total: number;
    today: WindowedCount;
    lastSevenDays: WindowedCount;
    /** Arama projeksiyonuna işlenmiş belge sayısı; ölçüm gelmezse null. */
    indexed: number | null;
    indexPending: number | null;
    recent: DocumentListItem[];
  };
  folders: {
    total: number;
    available: number;
    onLoan: number;
    transferred: number;
    disposed: number;
    placed: number;
    recent: FolderListItem[];
  };
  loans: {
    active: number;
    overdue: number;
  };
  locations: {
    items: LocationOccupancyItem[];
    count: number;
    capacity: number;
    /** Kapasitesi tanımlı konumlara yerleştirilmiş klasör sayısı. */
    used: number;
  };
  /** Operasyonel anlık görüntü; servis kapalıysa null. */
  operations: {
    processingActive: number | null;
    processingFailed: number | null;
    securityPending: number | null;
    ingestionRejected: number | null;
    outboxPending: number | null;
  } | null;
};

const emptyPage = { page: 1, pageSize: RECENT_SAMPLE_SIZE, totalCount: 0 };
const emptyFolderPage: PagedResult<FolderListItem> = { ...emptyPage, items: [] };
const emptyDocumentPage: PagedResult<DocumentListItem> = { ...emptyPage, items: [] };

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [
    dashboardData,
    locations,
    foldersResult,
    availableCount,
    onLoanCount,
    transferredCount,
    disposedCount,
    documentsResult,
    activeLoanCount,
    overdueLoanCount,
  ] = await Promise.all([
    getDashboardData().catch(() => null),
    // Kullanıcının yetkisi olmayan modül panoda boş kalır, ekranı düşürmez.
    whenPermitted(getLocationOccupancy(), []),
    whenPermitted(getFolders(1, RECENT_SAMPLE_SIZE, {}), emptyFolderPage),
    whenPermitted(countFolders({ status: "Available" }), 0),
    whenPermitted(countFolders({ status: "OnLoan" }), 0),
    whenPermitted(countFolders({ status: "Transferred" }), 0),
    whenPermitted(countFolders({ status: "Disposed" }), 0),
    whenPermitted(getDocuments(1, RECENT_SAMPLE_SIZE), emptyDocumentPage),
    whenPermitted(countLoans({ status: "Active" }), 0),
    whenPermitted(countLoans({ overdueOnly: true }), 0),
  ]);

  const overview = dashboardData?.overview ?? null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const capacity = locations.reduce((sum, l) => sum + (l.capacity ?? 0), 0);
  const used = locations.reduce(
    (sum, l) => sum + (l.capacity === null ? 0 : l.folderCount),
    0,
  );

  return {
    documents: {
      total: dashboardData?.documentCount ?? documentsResult.totalCount,
      today: countSince(documentsResult.items, startOfToday),
      lastSevenDays: countSince(documentsResult.items, startOfWeek),
      indexed: overview
        ? measurement(overview, "search", "projection_documents")
        : null,
      indexPending: overview
        ? measurement(overview, "search", "index_pending")
        : null,
      recent: documentsResult.items.slice(0, 5),
    },
    folders: {
      total: foldersResult.totalCount,
      available: availableCount,
      onLoan: onLoanCount,
      transferred: transferredCount,
      disposed: disposedCount,
      placed: locations.reduce((sum, l) => sum + l.folderCount, 0),
      recent: foldersResult.items.slice(0, 5),
    },
    loans: {
      active: activeLoanCount,
      overdue: overdueLoanCount,
    },
    locations: {
      items: locations,
      count: locations.length,
      capacity,
      used,
    },
    operations: overview
      ? {
          processingActive: measurement(overview, "processing", "jobs_active"),
          processingFailed: measurement(overview, "processing", "jobs_failed"),
          securityPending: measurement(overview, "documents", "security_pending"),
          ingestionRejected: measurement(
            overview,
            "documents",
            "ingestion_rejected",
          ),
          outboxPending: measurement(overview, "documents", "outbox_pending"),
        }
      : null,
  };
}

function countSince(
  items: ReadonlyArray<{ createdAt: string }>,
  since: Date,
): WindowedCount {
  const threshold = since.getTime();
  const count = items.filter(
    (item) => new Date(item.createdAt).getTime() >= threshold,
  ).length;

  return {
    count,
    isPartial: count === RECENT_SAMPLE_SIZE && items.length === RECENT_SAMPLE_SIZE,
  };
}
