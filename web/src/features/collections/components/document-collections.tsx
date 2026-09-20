"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addDocumentToCollectionAction } from "@/features/collections/api/add-to-collection-action";
import type { CollectionListItem } from "@/features/collections/model/collection";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

const initialState: ActionState = { status: "idle" };

const selectClass =
  "h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Belge görüntüleyicideki koleksiyon bölümü. Ekleme belgeyi taşımaz; yalnızca
 * sanal gruplamaya bağlar (§20).
 */
export function DocumentCollections({
  documentId,
  memberOf,
  available,
}: {
  documentId: string;
  memberOf: CollectionListItem[];
  available: CollectionListItem[];
}) {
  const [state, formAction, isPending] = useActionState(
    addDocumentToCollectionAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Belge koleksiyona eklendi.");
    }

    if (state.status === "error") {
      toast.error(state.message ?? "Belge eklenemedi.");
    }
  }, [state]);

  const memberIds = new Set(memberOf.map((collection) => collection.id));
  const addable = available.filter((collection) => !memberIds.has(collection.id));

  return (
    <div className="border-t border-border pt-3">
      <h3 className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Star className="size-3.5" aria-hidden />
        Koleksiyonlar
      </h3>

      {memberOf.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Bu belge hiçbir koleksiyonda değil.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {memberOf.map((collection) => (
            <li key={collection.id}>
              <Link
                href={`/koleksiyonlar/${collection.id}`}
                className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs hover:bg-muted"
              >
                {collection.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {addable.length > 0 ? (
        <form action={formAction} className="mt-2.5 flex items-center gap-1.5">
          <input type="hidden" name="documentId" value={documentId} />
          <label htmlFor="collectionId" className="sr-only">
            Koleksiyon seç
          </label>
          <select
            id="collectionId"
            name="collectionId"
            className={selectClass}
            defaultValue=""
            required
          >
            <option value="">— Koleksiyona ekle —</option>
            {addable.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
          <Button type="submit" size="xs" variant="outline" disabled={isPending}>
            <Plus className="size-3" aria-hidden />
            Ekle
          </Button>
        </form>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          {available.length === 0
            ? "Tanımlı koleksiyon yok."
            : "Belge tüm koleksiyonlarda yer alıyor."}
        </p>
      )}
    </div>
  );
}
