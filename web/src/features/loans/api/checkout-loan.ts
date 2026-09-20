import { apiPost } from "@/lib/api/api-client";

export type CheckoutLoanInput = {
  folderId: string;
  borrowerSubjectId: string;
  purpose: string;
  dueAt: string;
};

export async function checkoutLoan(
  input: CheckoutLoanInput,
): Promise<{ id: string }> {
  return apiPost<CheckoutLoanInput, { id: string }>(
    `/physical-archive/folders/${input.folderId}/checkout`,
    input,
  );
}
