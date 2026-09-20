"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "@/components/ui/folder-tree.module.css";
import type { FilePlanNode } from "@/features/classification/model/classification";
import { FilePlanNodeActions } from "./file-plan-node-actions";

type TreeNode = FilePlanNode & { children: TreeNode[] };

export function FilePlanTreeView({ nodes, name, search = "", planId, canManage = false, onChanged }: {
  nodes: FilePlanNode[];
  name: string;
  search?: string;
  planId?: string;
  canManage?: boolean;
  onChanged?: () => void;
}) {
  const roots = useMemo(() => buildTree(nodes), [nodes]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = nodes.find(node => node.id === selectedId);
  const term = search.trim().toLocaleLowerCase("tr-TR");
  const visibleRoots = useMemo(() => filterTree(roots, term), [roots, term]);

  function toggle(id: string) {
    setCollapsed(current => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-start gap-2 text-sm font-semibold"><FolderOpen aria-hidden className={styles.icon} />{name}</h3>
          <div className="flex gap-3 text-xs text-primary">
            <button type="button" onClick={() => setCollapsed(new Set())} disabled={!!term} className="rounded underline disabled:opacity-50">Tümünü aç</button>
            <button type="button" onClick={() => setCollapsed(new Set(nodes.map(node => node.id)))} disabled={!!term} className="rounded underline disabled:opacity-50">Tümünü daralt</button>
          </div>
        </div>
        <ul aria-label="Standart Dosya Planı" className={styles.tree}>
          {visibleRoots.map(node => <TreeItem key={node.id} node={node} collapsed={collapsed} searching={!!term} onToggle={toggle} selectedId={selectedId} onSelect={setSelectedId} />)}
        </ul>
        {!visibleRoots.length && <p className="py-4 text-sm text-muted-foreground">Dosya planında kod bulunamadı.</p>}
      </div>
      <aside className="rounded-lg border border-border bg-card p-4 shadow-flat">
        <h3 className="text-sm font-semibold">Başlık ayrıntısı</h3>
        {selected ? (
          <>
            <dl className="mt-3 flex flex-col gap-2.5 text-sm">
              <Row label="Kod"><span className="font-mono">{selected.code}</span></Row>
              <Row label="Başlık">{selected.title}</Row>
              <Row label="Seviye">{selected.level}</Row>
              <Row label="Dosya açılabilir">{selected.isSelectable ? "Evet" : "Hayır"}</Row>
              <Row label="Durum">{selected.isActive ? "Aktif" : "Pasif"}</Row>
            </dl>
            {selected.description && <p className="mt-3 text-sm text-muted-foreground">{selected.description}</p>}
            <Link className="mt-4 inline-block text-sm text-primary underline" href={`/arama?${new URLSearchParams({ q: "", filePlanCode: selected.code })}`}>Belgeleri ara</Link>
            {canManage && planId && (
              <FilePlanNodeActions
                key={`${selected.id}/${selected.title}/${selected.isActive}/${selected.isSelectable}`}
                planId={planId}
                node={selected}
                hasChildren={nodes.some(node => node.parentId === selected.id)}
                onChanged={() => onChanged?.()}
              />
            )}
          </>
        ) : <p className="mt-2 text-sm text-muted-foreground">Ayrıntıları görmek için bir klasör başlığı seçin.</p>}
      </aside>
    </div>
  );
}

function TreeItem({ node, collapsed, searching, onToggle, selectedId, onSelect }: {
  node: TreeNode;
  collapsed: Set<string>;
  searching: boolean;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = searching || !collapsed.has(node.id);
  const isSelected = selectedId === node.id;
  const Icon = hasChildren && isExpanded ? FolderOpen : Folder;
  return (
    <li className={styles.branch}>
      <div className={cn(styles.row, "text-sm", isSelected && "bg-accent text-accent-foreground")}>
        {hasChildren ? <button type="button" onClick={() => onToggle(node.id)} aria-expanded={isExpanded}
          aria-label={isExpanded ? `${node.code} daralt` : `${node.code} genişlet`} disabled={searching}
          className="inline-flex size-5 shrink-0 items-center justify-center rounded focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
          {isExpanded ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
        </button> : <span className="size-5 shrink-0" aria-hidden />}
        <button type="button" onClick={() => onSelect(node.id)} aria-pressed={isSelected}
          className="flex min-w-0 flex-1 items-start gap-2 rounded text-left focus-visible:ring-2 focus-visible:ring-ring">
          <Icon className={styles.icon} aria-hidden />
          <span className="min-w-0 break-words"><span className="font-mono text-xs font-semibold">{node.code}</span> · {node.title}
            {!node.isActive && <span className="ml-2 text-xs text-muted-foreground">Pasif</span>}
          </span>
        </button>
      </div>
      {hasChildren && isExpanded && <ul className={styles.tree}>
        {node.children.map(child => <TreeItem key={child.id} node={child} collapsed={collapsed} searching={searching} onToggle={onToggle} selectedId={selectedId} onSelect={onSelect} />)}
      </ul>}
    </li>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2 last:border-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-right">{children}</dd></div>;
}

function buildTree(nodes: FilePlanNode[]): TreeNode[] {
  const byId = new Map(nodes.map(node => [node.id, { ...node, children: [] } as TreeNode]));
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  function sort(list: TreeNode[]) {
    list.sort((a, b) => a.code.localeCompare(b.code, "tr"));
    list.forEach(node => sort(node.children));
  }
  sort(roots);
  return roots;
}

// Keep ancestors as context; a matching group includes its entire subtree.
function filterTree(nodes: TreeNode[], term: string): TreeNode[] {
  if (!term) return nodes;
  return nodes.flatMap(node => {
    if (`${node.code} ${node.title}`.toLocaleLowerCase("tr-TR").includes(term)) return [node];
    const children = filterTree(node.children, term);
    return children.length ? [{ ...node, children }] : [];
  });
}
