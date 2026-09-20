export type WorkflowWorkItem = {
  assigneeSubjectId?: string | null;
  version?: number;
  isManual?: boolean;
  id: string;
  instanceId: string;
  definitionId: string;
  definitionName: string;
  documentId: string;
  nodeName: string;
  permission: string;
  status: string;
  createdAt: string;
  dueAt: string | null;
  isOverdue: boolean;
  completedBy?: string | null;
  completedAt?: string | null;
  outcome?: string | null;
  assignedBy?: string | null;
  assignedAt?: string | null;
};

export const workItemStatusLabels: Record<string, string> = {
  Open: "Açık",
  Escalated: "Yükseltildi",
  Completed: "Tamamlandı",
};

export const workItemStatusVariants: Record<
  string,
  "secondary" | "warning" | "success"
> = {
  Open: "secondary",
  Escalated: "warning",
  Completed: "success",
};
