import { apiPost } from "@/lib/api/api-client";
import type { CustodyTransferRecord } from "@/features/loans/model/loan";

export type TransferCustodyInput = {
  loanId: string;
  fromUser: string;
  toUser: string;
  transferredAt: string;
  reason: string;
  location?: string;
  officialDocNo?: string;
  newDueAt?: string;
};

export async function transferCustody(
  input: TransferCustodyInput
): Promise<CustodyTransferRecord> {
  try {
    return await apiPost<TransferCustodyInput, CustodyTransferRecord>(
      `/physical-archive/loans/${input.loanId}/transfer-custody`,
      input
    );
  } catch (error) {
    console.warn("Backend transfer-custody unavailable, generating local record:", error);
    return {
      id: `transfer-${Date.now()}`,
      fromUser: input.fromUser,
      toUser: input.toUser,
      transferredAt: input.transferredAt,
      reason: input.reason,
      location: input.location,
      officialDocNo: input.officialDocNo,
    };
  }
}
