"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  FolderTree,
  GitBranch,
  Layers,
  Search,
  Users,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { OrganizationUnit } from "@/features/organization/model/unit-plans";

type Node = OrganizationUnit & { children: Node[] };

const fold = (value: string) => value.toLocaleLowerCase("tr");

export function UnitTreeNav({
  units,
  selectedId,
  basePath,
}: {
  units: OrganizationUnit[];
  selectedId?: string;
  basePath: string;
}) {
  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Distinct types for quick filtering
  const distinctTypes = useMemo(() => {
    const types = new Set<string>();
    for (const u of units) {
      if (u.typeName) types.add(u.typeName);
    }
    return Array.from(types).sort((a, b) => a.localeCompare(b, "tr"));
  }, [units]);

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (onlyActive && !u.isActive) return false;
      if (selectedType !== "all" && u.typeName !== selectedType) return false;
      return true;
    });
  }, [units, onlyActive, selectedType]);

  const roots = useMemo(() => buildTree(filteredUnits), [filteredUnits]);

  const matches = useMemo(() => {
    const needle = fold(search.trim());
    if (!needle) return null;
    return new Set(
      filteredUnits
        .filter((unit) =>
          fold(`${unit.code} ${unit.name} ${unit.shortName ?? ""}`).includes(needle),
        )
        .map((unit) => unit.id),
    );
  }, [filteredUnits, search]);

  const activeCount = useMemo(() => units.filter((u) => u.isActive).length, [units]);

  function expandAll() {
    setCollapsed(new Set());
  }

  function collapseAll() {
    setCollapsed(new Set(units.map((u) => u.id)));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search & Filter Bar */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Birim adı veya kodunda ara…"
            aria-label="Birimlerde ara"
            className="h-8.5 pl-8 pr-7 text-xs rounded-lg bg-background"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Aramayı temizle"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Status Pills */}
        <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOnlyActive(false)}
              className={cn(
                "rounded-md px-2 py-0.5 font-medium transition-colors text-[11px]",
                !onlyActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "hover:bg-muted text-muted-foreground",
              )}
            >
              Tümü ({units.length})
            </button>
            <button
              type="button"
              onClick={() => setOnlyActive(true)}
              className={cn(
                "rounded-md px-2 py-0.5 font-medium transition-colors text-[11px]",
                onlyActive
                  ? "bg-primary/10 text-primary font-semibold"
                  : "hover:bg-muted text-muted-foreground",
              )}
            >
              Aktif ({activeCount})
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={expandAll}
              className="hover:text-foreground underline-offset-2 hover:underline"
              title="Tümünü Aç"
            >
              Tümünü Aç
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={collapseAll}
              className="hover:text-foreground underline-offset-2 hover:underline"
              title="Tümünü Daralt"
            >
              Daralt
            </button>
          </div>
        </div>

        {/* Level Filters (if any) */}
        {distinctTypes.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 border-t border-border/50 pt-2 text-[10px]">
            <span className="text-muted-foreground mr-1">Kademe:</span>
            <button
              type="button"
              onClick={() => setSelectedType("all")}
              className={cn(
                "rounded px-1.5 py-0.5 transition-colors font-medium",
                selectedType === "all"
                  ? "bg-foreground/10 text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              Hepsi
            </button>
            {distinctTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(selectedType === type ? "all" : type)}
                className={cn(
                  "rounded px-1.5 py-0.5 transition-colors font-medium truncate max-w-[120px]",
                  selectedType === type
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted",
                )}
                title={type}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tree Navigation Container */}
      <nav
        aria-label="Yönetilecek teşkilat birimi"
        className="max-h-[60vh] overflow-y-auto pr-1"
      >
        {roots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            <FolderTree className="mx-auto mb-2 size-6 text-muted-foreground/60" />
            <p className="font-medium">Birim bulunamadı</p>
            <p className="mt-0.5 text-[11px]">Seçili filtrelere uygun teşkilat birimi bulunamadı.</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {roots.map((node) => (
              <UnitBranch
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                collapsed={collapsed}
                matches={matches}
                basePath={basePath}
                onToggle={(id) =>
                  setCollapsed((current) => {
                    const next = new Set(current);
                    next.has(id) ? next.delete(id) : next.add(id);
                    return next;
                  })
                }
              />
            ))}
          </ul>
        )}
        {matches?.size === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            Aramaya uygun birim bulunamadı.
          </p>
        )}
      </nav>
    </div>
  );
}

function buildTree(units: OrganizationUnit[]): Node[] {
  const byId = new Map<string, Node>(
    units.map((unit) => [unit.id, { ...unit, children: [] }]),
  );
  const roots: Node[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  const sort = (nodes: Node[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    nodes.forEach((node) => sort(node.children));
  };
  sort(roots);
  return roots;
}

function subtreeMatches(node: Node, matches: Set<string> | null): boolean {
  if (!matches) return true;
  if (matches.has(node.id)) return true;
  return node.children.some((child) => subtreeMatches(child, matches));
}

function getUnitIcon(depth: number) {
  if (depth === 0) return Building2;
  if (depth === 1) return GitBranch;
  return Layers;
}

function UnitBranch({
  node,
  depth,
  selectedId,
  collapsed,
  matches,
  basePath,
  onToggle,
}: {
  node: Node;
  depth: number;
  selectedId?: string;
  collapsed: Set<string>;
  matches: Set<string> | null;
  basePath: string;
  onToggle: (id: string) => void;
}) {
  if (!subtreeMatches(node, matches)) return null;

  const isSelected = node.id === selectedId;
  const hasChildren = node.children.length > 0;
  const isOpen = matches !== null || !collapsed.has(node.id);
  const Icon = getUnitIcon(depth);

  return (
    <li className="relative">
      <div className="group flex items-center gap-1 rounded-md">
        <span
          style={{ paddingLeft: `${depth * 0.75}rem` }}
          className="shrink-0"
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              aria-expanded={isOpen}
              aria-label={isOpen ? `${node.name} daralt` : `${node.name} genişlet`}
              className="inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {isOpen ? (
                <ChevronDown className="size-3.5" aria-hidden />
              ) : (
                <ChevronRight className="size-3.5" aria-hidden />
              )}
            </button>
          ) : (
            <span className="inline-block size-5" aria-hidden />
          )}
        </span>

        <Link
          href={`${basePath}unitId=${node.id}`}
          aria-current={isSelected ? "page" : undefined}
          title={`${node.name} (${node.code})`}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-r-lg px-2 py-1.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            isSelected
              ? "bg-primary/10 text-primary font-semibold border-l-2 border-primary shadow-2xs"
              : "text-foreground/90 hover:bg-muted/70 hover:text-foreground border-l-2 border-transparent",
          )}
        >
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded transition-colors",
              isSelected
                ? "bg-primary/20 text-primary"
                : depth === 0
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : depth === 1
                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    : "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate leading-tight font-medium">
              {node.name}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground font-normal">
              <span className="font-mono">{node.code}</span>
              {node.typeName && (
                <span className="rounded bg-muted/80 px-1 py-0.2 text-[9px] text-muted-foreground">
                  {node.typeName}
                </span>
              )}
              {!node.isActive && (
                <span className="rounded bg-rose-500/10 text-rose-600 px-1 text-[9px]">
                  pasif
                </span>
              )}
            </span>
          </span>

          {node.memberCount > 0 && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-normal",
                isSelected
                  ? "bg-primary/20 text-primary font-semibold"
                  : "bg-muted text-muted-foreground",
              )}
              title={`${node.memberCount} personel`}
            >
              <Users className="size-2.5" aria-hidden />
              {node.memberCount}
            </span>
          )}
        </Link>
      </div>

      {isOpen && hasChildren && (
        <ul className="relative ml-2.5 pl-2.5 border-l border-border/50 space-y-1 mt-1">
          {node.children.map((child) => (
            <UnitBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              collapsed={collapsed}
              matches={matches}
              basePath={basePath}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
