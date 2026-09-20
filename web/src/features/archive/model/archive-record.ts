export type ArchiveRecordListItem = {
  id: string;
  documentId: string;
  documentVersionId: string;
  status: string;
  sha256Hash: string;
  mimeType: string;
  sizeBytes: number;
  classificationCode: string | null;
  retentionRuleCode: string | null;
  createdAt: string;
  declaredAt: string | null;
};

/**
 * `Candidate` orijinali saklanmış ama henüz kurumsal kayıt sayılmayan
 * belgedir. `Declared` beyan edilmiş, saklama süresi işlemeye başlamış kayıttır.
 */
export const archiveStatusLabels: Record<string, string> = {
  Candidate: "Beyan bekliyor",
  Declared: "Beyan edildi",
};

export const archiveStatusVariants: Record<string, "warning" | "success"> = {
  Candidate: "warning",
  Declared: "success",
};
