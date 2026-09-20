import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/api/api-client", async original => ({ ...await original<typeof import("@/lib/api/api-client")>(), apiPut: vi.fn(), apiDelete: vi.fn(), apiPost: vi.fn() }));
import { apiPut, apiDelete, ApiError } from "@/lib/api/api-client";
import { revalidatePath } from "next/cache";
import { saveUnitPlans, unitAction } from "./unit-actions";
beforeEach(() => vi.clearAllMocks());
describe("Birim yönetimi işlemleri", () => {
  it("birim, sürüm ve seçilen konuları kaydeder; üç arşiv ekranını yeniler", async () => {
    const data = new FormData(); data.set("unitId", "bid"); data.set("revision", "2"); data.append("planItem", "plan|item");
    vi.mocked(apiPut).mockResolvedValue({ revision: 3 });
    const result = await saveUnitPlans({ status: "idle" }, data);
    expect(apiPut).toHaveBeenCalledWith("/organization/units/bid/file-plans", { revision: 2, items: [{ planId: "plan", itemId: "item" }] });
    expect(result.revision).toBe(3);
    for (const path of ["/documents", "/tarama", "/dosya-islemleri"]) expect(revalidatePath).toHaveBeenCalledWith(path);
  });
  it("silme onayı verilmeden silme isteği göndermez", async () => {
    const data = new FormData(); data.set("operation", "delete"); data.set("unitId", "bid");
    expect((await unitAction({ status: "idle" }, data)).status).toBe("error"); expect(apiDelete).not.toHaveBeenCalled();
  });
  it("arşivi olan birimin silinme engelini kullanıcıya gösterir", async () => {
    const data = new FormData(); data.set("operation", "delete"); data.set("unitId", "bid"); data.set("confirm", "on");
    vi.mocked(apiDelete).mockRejectedValue(new ApiError("Belgesi bulunan birim silinemez.", 409));
    const result = await unitAction({ status: "idle" }, data);
    expect(result).toEqual({ status: "error", message: "Belgesi bulunan birim silinemez." });
  });
});
