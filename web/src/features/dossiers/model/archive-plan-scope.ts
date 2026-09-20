import type { FilePlanTree } from "@/features/classification/model/classification";

export type ArchivePlanUsage = { code: string; planId?: string; itemId?: string };

/** Keep a used topic and its actual parents, without exposing unrelated sibling branches. */
export function scopeArchivePlans(trees: FilePlanTree[], usage: ArchivePlanUsage[]): FilePlanTree[] {
  return trees.flatMap(tree => {
    const byId = new Map(tree.items.map(item => [item.id, item]));
    const visible = new Set<string>();
    for (const item of tree.items) {
      if (!usage.some(use => use.planId ? use.planId === tree.id && use.itemId === item.id : use.code === item.code)) continue;
      let current: typeof item | undefined = item;
      while (current && !visible.has(current.id)) {
        visible.add(current.id);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
    }
    return visible.size ? [{ ...tree, items: tree.items.filter(item => visible.has(item.id)) }] : [];
  });
}
