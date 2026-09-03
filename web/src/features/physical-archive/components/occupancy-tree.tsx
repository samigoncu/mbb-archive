"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LocationOccupancyItem } from "@/features/physical-archive/api/get-occupancy";
import { locationTypeLabels } from "@/features/physical-archive/model/location";

type Node = LocationOccupancyItem & {
  children: Node[];
  totalFolders: number;
  totalCapacity: number;
};

export function OccupancyTree({ locations }: { locations: LocationOccupancyItem[] }) {
  const roots = useMemo(() => buildTree(locations), [locations]);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(roots.map((node) => node.id)),
  );

  if (roots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
        Henüz arşiv yerleşimi tanımlanmamış.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-flat">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span className="flex-1">Yerleşim Birimi</span>
        <span className="w-40">Doluluk</span>
        <span className="w-24 text-right">Dosya</span>
      </div>
      <ul className="divide-y divide-border">
        {roots.map((node) => (
          <Row
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={(id) =>
              setExpanded((current) => {
                const next = new Set(current);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
              })
            }
          />
        ))}
      </ul>
    </div>
  );
}

function Row({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: Node;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const ratio =
    node.totalCapacity > 0 ? node.totalFolders / node.totalCapacity : null;

  return (
    <>
      <li className="flex items-center gap-3 px-3 py-2">
        <div
          className="flex min-w-0 flex-1 items-center gap-1.5"
          style={{ paddingLeft: `${depth * 1.1}rem` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              aria-label={isExpanded ? `${node.code} daralt` : `${node.code} genişlet`}
              className="inline-flex size-6 shrink-0 items-center justify-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isExpanded ? (
                <ChevronDown className="size-3.5" aria-hidden />
              ) : (
                <ChevronRight className="size-3.5" aria-hidden />
              )}
            </button>
          ) : (
            <span className="size-6 shrink-0" aria-hidden />
          )}
          <span className="font-mono text-xs font-semibold">{node.code}</span>
          <span className="truncate text-sm">{node.name}</span>
          <span className="shrink-0 text-2xs uppercase tracking-wider text-muted-foreground">
            {locationTypeLabels[node.type]}
          </span>
        </div>

        <div className="w-40">
          {ratio === null ? (
            <span className="text-xs text-muted-foreground">kapasite yok</span>
          ) : (
            <div className="flex items-center gap-2">
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={`%${Math.round(ratio * 100)} dolu`}
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    ratio >= 0.9
                      ? "bg-destructive"
                      : ratio >= 0.7
                        ? "bg-amber-500"
                        : "bg-emerald-600",
                  )}
                  style={{ width: `${Math.min(100, ratio * 100)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                %{Math.round(ratio * 100)}
              </span>
            </div>
          )}
        </div>

        <span className="w-24 text-right text-sm tabular-nums">
          {node.totalFolders}
          {node.totalCapacity > 0 ? (
            <span className="text-muted-foreground"> / {node.totalCapacity}</span>
          ) : null}
        </span>
      </li>

      {hasChildren && isExpanded
        ? node.children.map((child) => (
            <Row
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))
        : null}
    </>
  );
}

function buildTree(items: LocationOccupancyItem[]): Node[] {
  const byId = new Map<string, Node>(
    items.map((item) => [
      item.id,
      { ...item, children: [], totalFolders: 0, totalCapacity: 0 },
    ]),
  );
  const roots: Node[] = [];

  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }

  // Alt düğüm toplamları yukarı taşınır; ara düğümlerde kendi kapasitesi yoktur.
  const roll = (node: Node): Node => {
    node.children.forEach(roll);
    node.totalFolders =
      node.folderCount + node.children.reduce((sum, c) => sum + c.totalFolders, 0);
    node.totalCapacity =
      (node.capacity ?? 0) + node.children.reduce((sum, c) => sum + c.totalCapacity, 0);
    node.children.sort((a, b) => a.code.localeCompare(b.code, "tr"));
    return node;
  };

  roots.forEach(roll);
  roots.sort((a, b) => a.code.localeCompare(b.code, "tr"));

  return roots;
}
