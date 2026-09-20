import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), post: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/api/api-client", () => ({ apiPost: mocks.post, ApiError: class extends Error {} }));
vi.mock("@/features/access/api/get-current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { operationsAction } from "./actions";
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ isAuthenticated: true, permissions: ["operations.dr.manage"] }); });
it("rejects alarm management without permission before calling the API", async () => {
  const data = new FormData(); data.set("operation", "evaluate");
  expect((await operationsAction({ status: "idle" }, data)).status).toBe("error");
  expect(mocks.post).not.toHaveBeenCalled();
});
it("does not submit an unsupported recovery success without evidence", async () => {
  const data = new FormData(); data.set("operation", "dr-complete"); data.set("id", "test"); data.set("notes", "result");
  expect((await operationsAction({ status: "idle" }, data)).message).toContain("Kanıt");
  expect(mocks.post).not.toHaveBeenCalled();
});
it("persists recovery evidence through the authorized API", async () => {
  const data = new FormData(); Object.entries({ operation: "dr-complete", id: "test", evidence: "evidence://test", notes: "Restored", passed: "false", rpo: "10", rto: "20" }).forEach(([key, value]) => data.set(key, value));
  expect((await operationsAction({ status: "idle" }, data)).status).toBe("success");
  expect(mocks.post).toHaveBeenCalledWith("/operations/recovery-drills/test/complete", { evidenceReference: "evidence://test", notes: "Restored", passed: false, actualRpoMinutes: 10, actualRtoMinutes: 20 });
});
