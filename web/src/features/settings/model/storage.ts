/**
 * Arşiv nesnelerinin nerede tutulduğu.
 *
 * <para>
 * Salt okunur: depolama yeri bir dağıtım kararıdır. Yolu değiştirmek var olan
 * nesneleri taşımadığı için bu bilgi görüntülenir, düzenlenmez.
 * </para>
 */
export type StorageStatus = {
  provider: string;
  location: string;
  objectCount: number;
  storedBytes: number;
  referenceCount: number;
  deduplicatedBytes: number;
  worm: { enabled: boolean; mode: string; retentionDays: number; supported: boolean };
  volume: { root: string; totalBytes: number; availableBytes: number; usedPercent: number } | null;
  staging: { root: string; fileCount: number; bytes: number };
  isReachable: boolean;
  problem: string | null;
};

/** Bayt değerini okunur birime çevirir; arşivde GB mertebesi olağandır. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} ${units[unit]}`;
}
