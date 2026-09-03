"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilePlanNode } from "@/features/classification/model/classification";

type TreeNode = FilePlanNode & { children: TreeNode[] };

export function FilePlanTreeView({ nodes }: { nodes: FilePlanNode[] }) {
  const roots = useMemo(() => buildTree(nodes), [nodes]);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(roots.map((node) => node.id)),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => nodes.find((node) => node.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (roots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Bu dosya planında henüz tasnif düğümü yok.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-lg border border-border bg-card p-2 shadow-flat">
        <ul role="tree" aria-label="Tasnif ağacı" className="flex flex-col">
          {roots.map((node) => (
            <TreeItem
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </ul>
      </div>

      <aside className="rounded-lg border border-border bg-card p-4 shadow-flat">
        <h3 className="text-sm font-semibold">Düğüm Ayrıntısı</h3>
        {selected ? (
          <dl className="mt-3 flex flex-col gap-2.5 text-sm">
            <Row label="Kod">
              <span className="font-mono">{selected.code}</span>
            </Row>
            <Row label="Başlık">{selected.title}</Row>
            <Row label="Seviye">{selected.level}</Row>
            <Row label="Dosya açılabilir">
              {selected.isSelectable ? "Evet" : "Hayır"}
            </Row>
            <Row label="Durum">{selected.isActive ? "Aktif" : "Pasif"}</Row>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Ayrıntıyı görmek için ağaçtan bir düğüm seçin.
          </p>
        )}
      </aside>
    </div>
  );
}

function TreeItem({
  node,
  depth,
  expanded,
  onToggle,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const Icon = node.isSelectable ? FileText : isExpanded ? FolderOpen : Folder;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined}>
      <div
        className={cn(
          "flex min-h-9 items-center gap-1.5 rounded-md pr-2 text-sm",
          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted",
        )}
        style={{ paddingLeft: `${depth * 1.25 + 0.25}rem` }}
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

        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon
            className={cn(
              "size-3.5 shrink-0",
              node.isSelectable ? "text-primary" : "text-muted-foreground",
            )}
            aria-hidden
          />
          <span className="font-mono text-xs font-semibold">{node.code}</span>
          <span className="truncate">{node.title}</span>
        </button>
      </div>

      {hasChildren && isExpanded ? (
        <ul role="group" className="flex flex-col">
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2 last:border-0">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function buildTree(nodes: FilePlanNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>(
    nodes.map((node) => [node.id, { ...node, children: [] }]),
  );
  const roots: TreeNode[] = [];

  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }

  const sort = (list: TreeNode[]) => {
    list.sort((a, b) => a.code.localeCompare(b.code, "tr"));
    list.forEach((node) => sort(node.children));
  };
  sort(roots);

  return roots;
}
