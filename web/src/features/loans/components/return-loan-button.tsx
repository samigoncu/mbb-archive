"use client";

import { useActionState, useEffect } from "react";
import { Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { returnLoanAction } from "@/features/loans/api/loan-actions";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

const initialState: ActionState = { status: "idle" };

export function ReturnLoanButton({
  loanId,
  folderBarcode,
}: {
  loanId: string;
  folderBarcode: string;
}) {
  const [state, action, pending] = useActionState(returnLoanAction, initialState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="loanId" value={loanId} />
      <Button
        type="submit"
        size="sm"
        variant="outline"
        disabled={pending}
        aria-label={`${folderBarcode} dosyasını iade al`}
      >
        <Undo2 className="size-3.5" aria-hidden />
        {pending ? "İşleniyor…" : "İade Al"}
      </Button>
    </form>
  );
}
