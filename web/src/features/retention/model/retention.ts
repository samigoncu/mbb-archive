export type RetentionCaseListItem = {
  id: string;
  archiveRecordId: string;
  documentId: string;
  ruleCode: string;
  action: string;
  status: string;
  triggerAt: string;
  dueAt: string | null;
  activeHoldCount: number;
};

export type RetentionRuleListItem = {
  id: string;
  code: string;
  name: string;
  retentionMonths: number;
  action: string;
  createdAt: string;
  caseCount: number;
};

export const actionLabels: Record<string, string> = {
  Review: "Gözden Geçir",
  Destroy: "Fiziksel imha",
  Transfer: "Devir",
  KeepPermanent: "Sürekli Sakla",
};

export const caseStatusLabels: Record<string, string> = {
  Scheduled: "Planlandı",
  Held: "Hukuki Blokede",
  Eligible: "Süresi Doldu",
  Completed: "Tamamlandı",
};
