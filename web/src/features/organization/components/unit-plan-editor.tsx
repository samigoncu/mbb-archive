"use client";

import { useActionState, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderTree,
  Info,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import styles from "@/components/ui/folder-tree.module.css";
import type {
  FilePlanTree,
  FilePlanNode,
} from "@/features/classification/model/classification";
import type { UnitPlanDetails } from "../model/unit-plans";
import { saveUnitPlans, type UnitPlanActionState } from "../api/unit-actions";

export function UnitPlanEditor({
  trees,
  initial,
  disabled,
}: {
  trees: FilePlanTree[];
  initial: UnitPlanDetails;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState(
    new Set(initial.items.map((item) => `${item.planId}|${item.itemId}`)),
  );
  const [search, setSearch] = useState("");
  const [state, action, pending] = useActionState(
    saveUnitPlans,
    { status: "idle" } as UnitPlanActionState,
  );

  const today = new Date().toISOString().slice(0, 10);
  const validTrees = trees.filter(
    (tree) =>
      tree.effectiveFrom <= today &&
      (!tree.effectiveTo || tree.effectiveTo >= today),
  );
  const knownKeys = new Set(
    validTrees.flatMap((tree) =>
      tree.items
        .filter((item) => item.isActive && item.isSelectable)
        .map((item) => `${tree.id}|${item.id}`),
    ),
  );
  const historical = initial.items.filter(
    (item) => !knownKeys.has(`${item.planId}|${item.itemId}`),
  );

  function toggle(keys: string[], checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      for (const key of keys) {
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  const term = search.trim().toLocaleLowerCase("tr");

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="unitId" value={initial.unitId} />
      <input
        type="hidden"
        name="revision"
        value={state.revision ?? initial.revision}
      />
      {[...selected].map((key) => (
        <input key={key} type="hidden" name="planItem" value={key} />
      ))}

      <div className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="size-4 shrink-0 text-primary mt-0.5" />
        <p>
          Bu birimin belge üretirken ve dosyalarken kullanacağı Standart Dosya Planı
          (SDP) başlıklarını işaretleyin. Seçilen başlıklar birim personeline
          doğrudan önerilir; alt birimlere otomatik miras kalmaz.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="SDP kodu veya konu başlığında ara…"
            className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-primary font-medium text-xs px-2.5 py-1"
          >
            {selected.size} başlık seçili
          </Badge>
        </div>
      </div>

      <fieldset
        disabled={disabled || pending}
        className="max-h-[55vh] overflow-auto rounded-xl border border-border bg-muted/15 p-4"
      >
        {validTrees.map((tree) => (
          <PlanChecklist
            key={tree.id}
            tree={tree}
            selected={selected}
            term={term}
            onToggle={toggle}
          />
        ))}

        {!validTrees.length && (
          <p className="p-4 text-center text-xs text-muted-foreground">
            Yürürlükte aktif dosya planı bulunamadı.
          </p>
        )}

        {historical.length > 0 && (
          <div className="mt-4 border-t border-border/80 pt-3">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Önceden atanmış, güncel katalogda yer almayan arşiv başlıkları:
            </p>
            <div className="mt-2 space-y-1.5">
              {historical.map((item) => {
                const key = `${item.planId}|${item.itemId}`;
                return (
                  <label
                    key={key}
                    className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={(event) => toggle([key], event.target.checked)}
                      className="mt-0.5 rounded border-border"
                    />
                    <span>
                      <strong className="font-mono text-foreground">
                        {item.code}
                      </strong>{" "}
                      · {item.title} ({item.version})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </fieldset>

      {disabled && (
        <p className="text-xs text-muted-foreground">
          Eşleştirme yapabilmek için birimin aktif olması ve organizasyon yönetimi
          yetkinizin bulunması gerekir.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={disabled || pending}
          className="font-medium text-xs shadow-xs"
        >
          {pending ? "Kaydediliyor…" : "SDP eşleştirmesini kaydet"}
        </Button>

        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={
              state.status === "error"
                ? "text-xs font-medium text-destructive"
                : "text-xs font-medium text-emerald-600 dark:text-emerald-400"
            }
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

function PlanChecklist({
  tree,
  selected,
  term,
  onToggle,
}: {
  tree: FilePlanTree;
  selected: Set<string>;
  term: string;
  onToggle: (keys: string[], checked: boolean) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const children = useMemo(
    () =>
      Map.groupBy(
        tree.items
          .filter((item) => item.isActive)
          .toSorted((a, b) => a.code.localeCompare(b.code, "tr")),
        (item) => item.parentId,
      ),
    [tree],
  );

  function toggleBranch(id: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function leaves(node: FilePlanNode): FilePlanNode[] {
    return [
      ...(node.isSelectable ? [node] : []),
      ...(children.get(node.id) ?? []).flatMap(leaves),
    ];
  }

  function matches(node: FilePlanNode): boolean {
    return (
      !term ||
      `${node.code} ${node.title}`.toLocaleLowerCase("tr").includes(term) ||
      (children.get(node.id) ?? []).some(matches)
    );
  }

  function branch(node: FilePlanNode): React.ReactNode {
    if (!matches(node)) return null;
    const nested = children.get(node.id) ?? [];
    const keys = leaves(node).map((item) => `${tree.id}|${item.id}`);
    const count = keys.filter((key) => selected.has(key)).length;
    const expanded = !!term || !collapsed.has(node.id);
    const Icon = nested.length > 0 && expanded ? FolderOpen : Folder;

    return (
      <li key={node.id} className={styles.branch}>
        <div className={`${styles.row} text-xs py-1`}>
          {nested.length > 0 ? (
            <button
              type="button"
              aria-label={`${node.code} ${expanded ? "daralt" : "genişlet"}`}
              aria-expanded={expanded}
              disabled={!!term}
              onClick={() => toggleBranch(node.id)}
              className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            >
              {expanded ? (
                <ChevronDown aria-hidden className="size-3.5" />
              ) : (
                <ChevronRight aria-hidden className="size-3.5" />
              )}
            </button>
          ) : (
            <span aria-hidden className="size-5 shrink-0" />
          )}

          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 select-none">
            <input
              type="checkbox"
              aria-label={`${node.code} · ${node.title}`}
              checked={keys.length > 0 && count === keys.length}
              disabled={!keys.length}
              ref={(element) => {
                if (element) {
                  element.indeterminate = count > 0 && count < keys.length;
                }
              }}
              onChange={(event) => onToggle(keys, event.target.checked)}
              className="mt-0.5 shrink-0 rounded border-border"
            />
            <Icon
              aria-hidden
              className={`${styles.icon} size-4 shrink-0 text-amber-500/80`}
            />
            <span className="min-w-0 break-words leading-tight">
              <strong className="font-mono text-foreground font-semibold">
                {node.code}
              </strong>{" "}
              · {node.title}
              {nested.length > 0 && (
                <span className="ml-1.5 text-[11px] text-muted-foreground font-normal">
                  ({count}/{keys.length})
                </span>
              )}
            </span>
          </label>
        </div>
        {nested.length > 0 && expanded && (
          <ul className={styles.tree}>{nested.map(branch)}</ul>
        )}
      </li>
    );
  }

  return (
    <section className="mb-4 rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <FolderOpen aria-hidden className="size-4 text-primary" />
          {tree.name} · {tree.version}
        </h3>
        <div className="flex gap-2 text-[11px] text-primary">
          <button
            type="button"
            onClick={() => setCollapsed(new Set())}
            disabled={!!term}
            className="hover:underline disabled:opacity-50"
          >
            Tümünü Aç
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setCollapsed(new Set(tree.items.map((item) => item.id)))}
            disabled={!!term}
            className="hover:underline disabled:opacity-50"
          >
            Tümünü Daralt
          </button>
        </div>
      </div>
      <ul
        aria-label={`${tree.name} eşleştirmeleri`}
        className={styles.tree}
      >
        {(children.get(null) ?? []).map(branch)}
      </ul>
    </section>
  );
}
