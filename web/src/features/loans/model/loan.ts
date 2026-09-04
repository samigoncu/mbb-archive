export type LoanStatus = "Active" | "Returned" | "Overdue";

export type CustodyTransferRecord = {
  id: string;
  fromUser: string;
  toUser: string;
  transferredAt: string;
  reason: string;
  location?: string;
  officialDocNo?: string;
};

export type LoanDetailsItem = {
  id: string;
  folderId: string;
  folderBarcode: string;
  folderTitle: string;
  filePlanCode: string;
  borrowerSubjectId: string; // İlk zimmetlenen personel
  currentHolder?: string; // Güncel dosya hamili (devir edildiyse)
  currentLocation?: string; // Dosyanın güncel fiziki konumu (oda/birim)
  custodyChain?: CustodyTransferRecord[]; // Zincirleme devir geçmişi (sınırsız)
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
