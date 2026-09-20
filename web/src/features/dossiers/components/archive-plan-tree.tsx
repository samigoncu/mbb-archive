"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Folder, FolderOpen } from "lucide-react";
import type { FilePlanTree, FilePlanNode } from "@/features/classification/model/classification";

type TreeProps = { tree: FilePlanTree; filePlanCode?: string; href: (code?: string) => string };

export function ArchivePlanTree({ tree, filePlanCode, href }: TreeProps) {
  const children = Map.groupBy(tree.items, node => node.parentId);
  const byId = new Map(tree.items.map(node => [node.id, node]));
  const selectedAncestors = new Set<string>();
  for (const selected of tree.items.filter(node => node.code === filePlanCode)) {
    let current: FilePlanNode | undefined = selected;
    while (current && !selectedAncestors.has(current.id)) {
      selectedAncestors.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  }
  function branch(node: FilePlanNode, depth: number): React.ReactNode {
    const items = children.get(node.id) ?? [];
    return <PlanBranch key={`${node.id}/${filePlanCode ?? ""}`} node={node} href={href(node.code)}
      selected={node.code === filePlanCode} initiallyOpen={depth === 0 || selectedAncestors.has(node.id)} hasChildren={items.length > 0}>
      {items.map(child => branch(child, depth + 1))}
    </PlanBranch>;
  }
  return <section aria-label={`${tree.name} · ${tree.version}`} className="mt-3">
    <p className="mb-2 pl-1 text-[11px] leading-relaxed text-muted-foreground">{tree.name} · {tree.version}</p>
    <ul className="ml-2 border-l border-border">{(children.get(null) ?? []).map(node => branch(node, 0))}</ul>
  </section>;
}

function PlanBranch({ node, href, selected, initiallyOpen, hasChildren, children }: {
  node: FilePlanNode; href: string; selected: boolean; initiallyOpen: boolean; hasChildren: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const Icon = hasChildren && open ? FolderOpen : Folder;
  return <li className="relative py-0.5 pl-3 before:absolute before:left-0 before:top-[18px] before:w-3 before:border-t before:border-border">
    <div className={`flex items-start gap-1 rounded-md pr-1 transition-colors ${selected ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
      {hasChildren ? <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        aria-label={`${node.code} · ${node.title} alt başlıklarını ${open ? "daralt" : "genişlet"}`}
        className="mt-1 flex size-6 shrink-0 items-center justify-center rounded hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronRight aria-hidden className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
      </button> : <span className="w-6 shrink-0" aria-hidden />}
      <Link href={href} prefetch={false} aria-current={selected ? "page" : undefined}
        className="flex min-w-0 flex-1 items-start gap-2 rounded py-1.5 text-xs leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Icon aria-hidden className="mt-0.5 size-4 shrink-0 fill-amber-200 text-amber-600 dark:fill-amber-900 dark:text-amber-400" />
        <span className={selected ? "font-semibold" : ""}>{node.code} · {node.title}</span>
      </Link>
    </div>
    {hasChildren && open && <ul className="ml-3 border-l border-border">{children}</ul>}
  </li>;
}
