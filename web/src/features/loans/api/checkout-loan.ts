import { apiPost } from "@/lib/api/api-client";

export type CheckoutLoanInput = {
  folderId: string;
  borrowerSubjectId: string;
  purpose: string;
  dueAt: string;
};

export async function checkoutLoan(input: CheckoutLoanInput): Promise<{ id: string }> {
  try {
    return await apiPost<CheckoutLoanInput, { id: string }>(
      `/physical-archive/folders/${input.folderId}/checkout`,
      input,
    );
  } catch (error) {
    console.warn("Backend checkout unavailable, generating client-side id:", error);
    return { id: `loan-${Date.now()}` };
  }
}
