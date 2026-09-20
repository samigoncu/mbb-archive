import { describe, expect, it } from "vitest";
import { scopeArchivePlans } from "./archive-plan-scope";
import type { FilePlanTree } from "@/features/classification/model/classification";
const tree: FilePlanTree = { id: "plan", code: "SDP", name: "Plan", authority: "Test", version: "2026", effectiveFrom: "2026-01-01", effectiveTo: null, items: [
  { id: "root", parentId: null, code: "100", title: "Ana başlık", level: 1, isActive: true, isSelectable: false },
  { id: "used", parentId: "root", code: "123", title: "Birim konusu", level: 2, isActive: true, isSelectable: true },
  { id: "other", parentId: "root", code: "124", title: "Diğer konu", level: 2, isActive: true, isSelectable: true },
  { id: "unrelated", parentId: null, code: "900", title: "Başka dal", level: 1, isActive: true, isSelectable: true },
] };
describe("Birim SDP ağacı", () => {
  it("dijital dosyanın konusunu ve kod öneki yerine gerçek üst ilişkisini korur", () => {
    expect(scopeArchivePlans([tree], [{ planId: "plan", itemId: "used", code: "123" }])[0].items.map(i => i.id)).toEqual(["root", "used"]);
  });
  it("başka plan sürümündeki aynı kodu birime atamaz", () => {
    expect(scopeArchivePlans([tree], [{ planId: "old-plan", itemId: "used", code: "123" }])).toEqual([]);
  });
  it("fiziksel klasör koduyla ilgili dalı bulur", () => {
    expect(scopeArchivePlans([tree], [{ code: "123" }])[0].items.map(i => i.id)).toEqual(["root", "used"]);
  });
  it("boş birimde ortak planı döndürmez ve kaynak kataloğunu değiştirmez", () => {
    expect(scopeArchivePlans([tree], [])).toEqual([]);
    expect(tree.items).toHaveLength(4);
  });
});
