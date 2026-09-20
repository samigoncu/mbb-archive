"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";
import { cn } from "@/lib/utils";

export function ActionForm({
  action,
  children,
  label = "Kaydet",
  onSuccess,
  className,
  submitClassName,
}: {
  action: (previous: ActionState, data: FormData) => Promise<ActionState>;
  children: ReactNode;
  label?: string;
  onSuccess?: (state: ActionState) => void;
  className?: string;
  submitClassName?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  } as ActionState);

  useEffect(() => {
    if (state.status === "success") {
      onSuccess?.(state);
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className={cn("flex flex-col gap-3", className)}>
      {children}
      <Button type="submit" disabled={pending} className={submitClassName}>
        {pending ? "İşleniyor…" : label}
      </Button>
      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className="text-sm"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
