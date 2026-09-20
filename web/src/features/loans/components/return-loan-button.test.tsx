import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReturnLoanButton } from "./return-loan-button";

const api = vi.hoisted(() => ({
  returnLoanAction: vi.fn(),
}));

vi.mock("@/features/loans/api/loan-actions", () => ({
  returnLoanAction: api.returnLoanAction,
}));

afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());

describe("ReturnLoanButton", () => {
  it("opens confirmation dialog, allows entering a return note, and confirms return", async () => {
    api.returnLoanAction.mockResolvedValue({
      status: "success",
      message: "Dosya başarıyla iade alındı.",
    });

    render(
      <ReturnLoanButton
        loanId="loan-123"
        folderBarcode="KL-2026-001"
        borrowerSubjectId="ahmet.yilmaz"
        folderTitle="İmar Planı Evrakları"
      />,
    );

    // Initial button click
    const trigger = screen.getByRole("button", { name: "KL-2026-001 dosyasını iade al" });
    fireEvent.click(trigger);

    // Modal should be open
    expect(screen.getByText("Fiziksel Dosya İadesi")).toBeTruthy();
    expect(screen.getByText("KL-2026-001")).toBeTruthy();
    expect(screen.getByText("ahmet.yilmaz")).toBeTruthy();
    expect(screen.getByText("İmar Planı Evrakları")).toBeTruthy();

    // Fill note
    const noteInput = screen.getByLabelText(/İade Açıklaması/);
    fireEvent.change(noteInput, { target: { value: "Dosya kontrol edildi ve sağlam." } });

    // Submit confirmation
    const confirmButton = screen.getByRole("button", { name: "İadeyi Onayla ve Arşive Al" });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(api.returnLoanAction).toHaveBeenCalledOnce());
  });

  it("can be cancelled without submitting", () => {
    render(
      <ReturnLoanButton
        loanId="loan-123"
        folderBarcode="KL-2026-001"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "KL-2026-001 dosyasını iade al" }));
    expect(screen.getByText("Fiziksel Dosya İadesi")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(api.returnLoanAction).not.toHaveBeenCalled();
  });
});

