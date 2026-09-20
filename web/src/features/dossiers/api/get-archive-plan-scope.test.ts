import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./dossiers", () => ({ getDossiers: vi.fn(), getArchiveUnits: vi.fn() }));
vi.mock("@/features/physical-archive/api/get-folders", () => ({ getFolders: vi.fn() }));
import { getUnitPlanAssignments } from "@/features/organization/api/unit-plans";
vi.mock("@/features/organization/api/unit-plans", () => ({ getUnitPlanAssignments: vi.fn() }));
import { getArchiveUnits, getDossiers } from "./dossiers";
import { getFolders } from "@/features/physical-archive/api/get-folders";
import { getArchivePlanScope } from "./get-archive-plan-scope";
import { context as unitContext } from "@/features/scanning/model/scan-context.fixtures";

beforeEach(() => { vi.clearAllMocks(); vi.mocked(getArchiveUnits).mockResolvedValue([]); vi.mocked(getUnitPlanAssignments).mockResolvedValue([]); });
describe("Birim arşivi konu sorgusu", () => {
  it("dijital dosyaların sonraki sayfalarını da aynı birim kapsamında okur", async () => {
    const context = unitContext("a");
    vi.mocked(getDossiers).mockResolvedValueOnce({ items: context.dossiers, page: 1, pageSize: 100, totalCount: context.dossiers.length + 1 })
      .mockResolvedValueOnce({ items: [context.dossiers[0]], page: 2, pageSize: 100, totalCount: context.dossiers.length + 1 });
    await getArchivePlanScope([], "a", "digital");
    expect(getDossiers).toHaveBeenNthCalledWith(2, { ownerUnitId: "a", page: "2", pageSize: "100" });
    expect(getFolders).not.toHaveBeenCalled();
  });
  it("fiziksel arşivde birim kapsamını korur, tablo aramasıyla ağacı daraltmaz", async () => {
    vi.mocked(getFolders).mockResolvedValue({ items: [], page: 1, pageSize: 100, totalCount: 0 });
    expect(await getArchivePlanScope([], "b", "physical")).toEqual([]);
    expect(getFolders).toHaveBeenCalledWith(1, 100, { ownerUnitId: "b" });
    expect(getDossiers).not.toHaveBeenCalled();
  });
  it("yetki ve servis hatalarını boş birim olarak göstermez", async () => {
    vi.mocked(getFolders).mockRejectedValue(new Error("forbidden"));
    await expect(getArchivePlanScope([], "b", "physical")).rejects.toThrow("forbidden");
  });
});
