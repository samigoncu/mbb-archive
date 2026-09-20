"use client";

import { useActionState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeDocumentFromCollectionAction } from "@/features/collections/api/collection-actions";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

const initialState: ActionState = { status: "idle" };

/** Çıkarma belgeyi silmez; yalnızca bu koleksiyondan koparır. */
export function RemoveFromCollectionButton({
  collectionId,
  documentId,
}: {
  collectionId: string;
  documentId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    removeDocumentFromCollectionAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Belge çıkarıldı.");
    }

    if (state.status === "error") {
      toast.error(state.message ?? "Belge çıkarılamadı.");
    }
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="collectionId" value={collectionId} />
      <input type="hidden" name="documentId" value={documentId} />
      <Button type="submit" size="xs" variant="ghost" disabled={isPending}>
        <X className="size-3.5" aria-hidden />
        Çıkar
      </Button>
    </form>
  );
}
