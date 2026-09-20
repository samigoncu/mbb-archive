import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiGet } from "@/lib/api/api-client";
import { getArchiveUnits, getDossiers } from "@/features/dossiers/api/dossiers";
import { getFolders } from "@/features/physical-archive/api/get-folders";
import { getDocuments } from "@/features/documents/api/get-documents";
import { getFilePlanTree } from "@/features/classification/api/get-classification";
import { getUnitPlanAssignments } from "@/features/organization/api/unit-plans";
vi.mock("@/features/organization/api/unit-plans", () => ({ getUnitPlanAssignments: vi.fn() }));
import { getScanContext } from "./get-scan-context";
import { unit, dossier, folder, plan, tree } from "../model/scan-context.fixtures";
vi.mock("@/lib/api/api-client", async importOriginal => ({ ...await importOriginal<typeof import("@/lib/api/api-client")>(), apiGet: vi.fn() }));
vi.mock("@/features/dossiers/api/dossiers", () => ({ getArchiveUnits: vi.fn(), getDossiers: vi.fn() }));
vi.mock("@/features/physical-archive/api/get-folders", () => ({ getFolders: vi.fn() }));
vi.mock("@/features/documents/api/get-documents", () => ({ getDocuments: vi.fn() }));
vi.mock("@/features/classification/api/get-classification", () => ({ getFilePlanTree: vi.fn() }));
const page = <T,>(items: T[]) => ({ items, totalCount: items.length, page: 1, pageSize: 100 });
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getUnitPlanAssignments).mockResolvedValue(tree.items.slice(0, 2).map(item => ({ unitId: "bid", planId: tree.id, itemId: item.id, code: item.code, title: item.title, version: tree.version })));
  vi.mocked(getArchiveUnits).mockResolvedValue([unit()]);
  vi.mocked(getDossiers).mockResolvedValue(page([dossier(), { ...dossier("child", "child-dossier"), filePlanItemId: "foreign-topic" }]));
  vi.mocked(getFolders).mockResolvedValue(page([folder(), { ...folder("child", "child-folder"), filePlanCode: "TEST.99" }]));
  vi.mocked(apiGet).mockResolvedValue(page([plan]));
  vi.mocked(getFilePlanTree).mockResolvedValue(tree);
  vi.mocked(getDocuments).mockResolvedValue(page([
    { id: "mine", title: "Kendi belgem", ownerUnitId: "bid", createdAt: "2026-01-01", status: "Draft", versionCount: 0 },
    { id: "child", title: "Alt birim belgesi", ownerUnitId: "child", createdAt: "2026-01-01", status: "Draft", versionCount: 0 },
  ]));
});
describe("Tarama için sunucuda birim kapsamı", () => {
  it("yalnız seçilen birimin dosyalarını, atanmış SDP konularını ve son belgelerini döndürür", async () => {
    const result = await getScanContext("bid");
    expect(result.dossiers.map(d => d.id)).toEqual(["digital-bid"]);
    expect(result.folders.map(f => f.id)).toEqual(["physical-bid"]);
    expect(result.classifications.map(c => c.code)).toEqual(["TEST.01", "TEST.02"]);
    expect(result.recentDocuments.map(d => d.id)).toEqual(["mine"]);
    expect(getFolders).toHaveBeenCalledWith(1, 100, { ownerUnitId: "bid", status: "Available" });
    expect(getDocuments).toHaveBeenCalledWith(1, 100, { ownerUnitId: "bid" });
  });
  it("yazma yetkisi olmayan birimi kayıt sorgulamadan reddeder", async () => {
    vi.mocked(getArchiveUnits).mockResolvedValue([{ ...unit(), canManageDocuments: false }]);
    await expect(getScanContext("bid")).rejects.toMatchObject({ status: 403 });
    expect(getDossiers).not.toHaveBeenCalled();
  });
  it("birim seçilmeden ortak dosya veya sınıflandırma listesini açmaz", async () => {
    expect((await getScanContext("")).classifications).toEqual([]);
    expect(apiGet).not.toHaveBeenCalled(); expect(getArchiveUnits).not.toHaveBeenCalled();
  });
  it("eşleştirme yapılmamış birimde ortak SDP konularını otomatik göstermez", async () => {
    vi.mocked(getUnitPlanAssignments).mockResolvedValue([]);
    vi.mocked(getDossiers).mockResolvedValue(page([])); vi.mocked(getFolders).mockResolvedValue(page([]));
    expect((await getScanContext("bid")).classifications).toEqual([]);
    expect(getFilePlanTree).not.toHaveBeenCalled();
  });
  it("dosya açılmadan da atanmış SDP konularını gösterir", async () => {
    vi.mocked(getDossiers).mockResolvedValue(page([])); vi.mocked(getFolders).mockResolvedValue(page([]));
    expect((await getScanContext("bid")).classifications.map(item => item.code)).toEqual(["TEST.01", "TEST.02"]);
  });
  it("ilk 100 kayıtla sınırlanmaz", async () => {
    vi.mocked(getDossiers).mockImplementation(async args => Number(args?.page) === 1
      ? { items: Array.from({ length: 100 }, (_, i) => dossier("child", `child-${i}`)), totalCount: 101, page: 1, pageSize: 100 }
      : { items: [dossier()], totalCount: 101, page: 2, pageSize: 100 });
    expect((await getScanContext("bid")).dossiers.map(d => d.id)).toEqual(["digital-bid"]);
    expect(getDossiers).toHaveBeenCalledTimes(2);
  });
  it("yürürlük dışı planı ve seçilemez konuyu seçeneklere katmaz", async () => {
    vi.mocked(apiGet).mockResolvedValue(page([plan, { ...plan, id: "expired", effectiveTo: "2001-01-01" }]));
    vi.mocked(getFilePlanTree).mockResolvedValue({ ...tree, items: tree.items.map(i => ({ ...i, isSelectable: i.id !== "topic" })) });
    expect((await getScanContext("bid")).classifications.map(c => c.code)).toEqual(["TEST.02"]);
    expect(getFilePlanTree).toHaveBeenCalledTimes(1);
  });
  it("fiziksel erişimi olmayan kullanıcının dijital seçenekleri çalışır", async () => {
    vi.mocked(getFolders).mockRejectedValue(new ApiError("Forbidden", 403));
    const result = await getScanContext("bid");
    expect(result.folders).toEqual([]); expect(result.classifications.map(c => c.code)).toEqual(["TEST.01", "TEST.02"]);
  });
  it("servis kesintisini boş arşiv gibi göstermez", async () => {
    vi.mocked(getFolders).mockRejectedValue(new ApiError("Down", 503));
    await expect(getScanContext("bid")).rejects.toMatchObject({ status: 503 });
  });
});
