export type DispositionAction = "Transfer" | "Destroy" | "KeepPermanent";
export type DispositionStatus = "Draft" | "UnderReview" | "PendingApproval" | "Approved" | "Rejected" | "Completed";
export type Disposition = {
  id: string; retentionCaseId: string; documentId: string; action: DispositionAction;
  status: DispositionStatus; reason: string; commissionReference: string;
  createdBy: string; createdAt: string; requiredReviews: number;
  approvedBy: string | null; approvedAt: string | null; approvalReference: string | null;
  completedBy: string | null; completedAt: string | null; receivingArchive: string | null;
  receiptReference: string | null; version: number;
  commissionValidFrom: string | null; commissionValidUntil: string | null;
  members: { subject: string; delegateSubject: string | null; delegationReference: string | null; delegateFrom: string | null; delegateUntil: string | null }[];
  transferPackageId: string | null; transferManifestSha256: string | null; transferPackageSha256: string | null;
  transferPackageSize: number | null; packageCreatedBy: string | null; packageCreatedAt: string | null;
  packageVerifiedBy: string | null; packageVerifiedAt: string | null;
  executionEvidenceDocumentId: string | null; executionEvidenceVersionId: string | null; executionEvidenceSha256: string | null;
  executionMethod: string | null; executionLocation: string | null; executionWitnesses: string | null; physicalExecutedAt: string | null;
  reviews: { id: string; actor: string; approved: boolean; reason: string; reviewedAt: string }[];
};
export type LegalHold = {
  id: string; retentionCaseId: string; reason: string; placedBy: string; placedAt: string;
  releasedAt: string | null; isActive: boolean; releasedBy: string | null; releaseReason: string | null;
};
export const dispositionStatusLabels: Record<DispositionStatus, string> = {
  Draft: "Taslak", UnderReview: "Komisyonda", PendingApproval: "Nihai onay bekliyor",
  Approved: "Onaylandı", Rejected: "Reddedildi", Completed: "Tamamlandı",
};
export type ProcessOperation = "submit" | "reviews" | "approve" | "accept-transfer" | "keep-permanently" | "execute-destruction";
