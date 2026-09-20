import { afterEach, expect, it, vi } from "vitest";
import { createFilePlan } from "./create-file-plan";
import { addFilePlanItem } from "./add-file-plan-item";
import { checkoutLoan } from "@/features/loans/api/checkout-loan";
afterEach(() => vi.unstubAllGlobals());
it("never turns failed mutations into fabricated ids", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ detail: "Service unavailable" }), {
            status: 503,
          }),
      ),
  );
  await expect(
    createFilePlan({
      code: "test",
      name: "test",
      version: "1",
      authority: "test",
      effectiveFrom: "2026-01-01",
    }),
  ).rejects.toThrow("Service unavailable");
  await expect(
    addFilePlanItem("id", {
      code: "test",
      title: "test",
      level: 1,
      isSelectable: true,
    }),
  ).rejects.toThrow("Service unavailable");
  await expect(
    checkoutLoan({
      folderId: "id",
      borrowerSubjectId: "test",
      purpose: "test",
      dueAt: "2026-10-01",
    }),
  ).rejects.toThrow("Service unavailable");
});
