export type LoanStatus = "Active" | "Returned" | "Overdue";

export type LoanDetailsItem = {
  id: string;
  folderId: string;
  folderBarcode: string;
  folderTitle: string;
  filePlanCode: string;
  borrowerSubjectId: string;
  purpose: string;
  status: LoanStatus;
  checkedOutAt: string;
  dueAt: string;
  returnedAt: string | null;
  isOverdue: boolean;
  daysOverdue: number;
};

export type LoanFilters = {
  status?: string;
  borrowerSubjectId?: string;
  overdueOnly?: boolean;
  dueInDays?: number;
};

export const loanStatusLabels: Record<LoanStatus, string> = {
  Active: "Zimmette",
  Returned: "İade Alındı",
  Overdue: "Gecikmiş",
};
