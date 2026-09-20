"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { MapPin, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  closeGeoRelationAction,
  createGeoRelationAction,
} from "@/features/geo/api/geo-relation-actions";
import {
  geoEntityTypeLabels,
  geoRelationTypeLabels,
  type GeoEntitySummary,
  type GeoRelationDetails,
} from "@/features/geo/model/geo";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

const initialState: ActionState = { status: "idle" };

const fieldClass =
  "h-8 min-w-0 rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Belge görüntüleyicinin Harita sekmesi (§18 belge → harita). İlişkiler
 * kapatılabilir ama silinemez; hangi kararın hangi dönemde etkili olduğu
 * kayıtta kalır.
 */
export function DocumentGeoRelations({
  documentId,
  relations,
  entities,
}: {
  documentId: string;
  relations: GeoRelationDetails[];
  entities: GeoEntitySummary[];
}) {
  const [createState, createAction, isCreating] = useActionState(
    createGeoRelationAction,
    initialState,
  );

  useEffect(() => {
    if (createState.status === "success") {
      toast.success(createState.message ?? "Harita ilişkisi kuruldu.");
    }

    if (createState.status === "error") {
      toast.error(createState.message ?? "İlişki kurulamadı.");
    }
  }, [createState]);

  const activeIds = new Set(
    relations.filter((relation) => relation.isActive).map((r) => r.geoEntityId),
  );

  const selectable = entities.filter((entity) => !activeIds.has(entity.id));

  return (
    <div className="flex flex-col gap-3">
      {relations.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Bu belge henüz coğrafi bir nesneyle ilişkilendirilmemiş.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {relations.map((relation) => (
            <li
              key={relation.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border p-2.5"
            >
              <div className="min-w-0">
                <Link
                  href="/harita"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <MapPin className="size-3.5" aria-hidden />
                  {relation.geoEntityName}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">
                    {geoRelationTypeLabels[relation.relationType] ??
                      relation.relationType}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {geoEntityTypeLabels[relation.geoEntityType] ??
                      relation.geoEntityType}
                  </span>
                  {relation.isActive ? null : (
                    <Badge variant="outline">
                      kapalı · {relation.validTo?.slice(0, 10)}
                    </Badge>
                  )}
                </div>
              </div>

              {relation.isActive ? (
                <CloseRelationButton
                  documentId={documentId}
                  relationId={relation.id}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {selectable.length > 0 ? (
        <form
          action={createAction}
          className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3"
        >
          <input type="hidden" name="documentId" value={documentId} />

          <label htmlFor="geoEntityId" className="sr-only">
            Coğrafi nesne
          </label>
          <select
            id="geoEntityId"
            name="geoEntityId"
            defaultValue=""
            className={`${fieldClass} flex-1`}
            required
          >
            <option value="">— Haritadan nesne seç —</option>
            {selectable.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name} (
                {geoEntityTypeLabels[entity.entityType] ?? entity.entityType})
              </option>
            ))}
          </select>

          <label htmlFor="relationType" className="sr-only">
            İlişki türü
          </label>
          <select
            id="relationType"
            name="relationType"
            defaultValue="Subject"
            className={fieldClass}
          >
            {Object.entries(geoRelationTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <Button type="submit" size="xs" variant="outline" disabled={isCreating}>
            <Plus className="size-3" aria-hidden />
            İlişkilendir
          </Button>
        </form>
      ) : (
        <p className="border-t border-border pt-3 text-xs text-muted-foreground">
          {entities.length === 0
            ? "Katalogda coğrafi nesne yok."
            : "Belge tüm nesnelerle ilişkilendirilmiş."}
        </p>
      )}
    </div>
  );
}

function CloseRelationButton({
  documentId,
  relationId,
}: {
  documentId: string;
  relationId: string;
}) {
  const [state, action, isPending] = useActionState(
    closeGeoRelationAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "İlişki kapatıldı.");
    }

    if (state.status === "error") {
      toast.error(state.message ?? "İlişki kapatılamadı.");
    }
  }, [state]);

  return (
    <form action={action}>
      <input type="hidden" name="documentId" value={documentId} />
      <input type="hidden" name="relationId" value={relationId} />
      <Button
        type="submit"
        size="xs"
        variant="ghost"
        disabled={isPending}
        title="İlişkiyi kapat (kayıt silinmez)"
      >
        <X className="size-3.5" aria-hidden />
        Kapat
      </Button>
    </form>
  );
}
