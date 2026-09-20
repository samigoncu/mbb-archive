import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), post: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/api/api-client", () => ({ apiPost: mocks.post, ApiError: class extends Error {} }));
vi.mock("@/features/access/api/get-current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { directoryAction } from "./directory-actions";
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ isAuthenticated: true, permissions: ["organization.manage"] }); });
it("requires an administrator and explicit mapping confirmation", async () => {
  const data = new FormData(); data.set("operation", "sync-user");
  expect((await directoryAction({ status: "idle" }, data)).status).toBe("error");
  data.set("confirm", "on"); mocks.user.mockResolvedValue({ isAuthenticated: true, permissions: [] });
  expect((await directoryAction({ status: "idle" }, data)).status).toBe("error");
  expect(mocks.post).not.toHaveBeenCalled();
});
it("keeps OIDC subject and LDAP lookup identity separate and reports revocations", async () => {
  mocks.post.mockResolvedValue({ unitsCreated: 0, unitsLinked: 0, membershipsAssigned: 1, membershipsRemoved: 1, warnings: [] });
  const data = new FormData(); Object.entries({ operation: "sync-user", confirm: "on", subjectId: "oidc-guid", directoryUserName: "account" }).forEach(([key, value]) => data.set(key, value));
  const result = await directoryAction({ status: "idle" }, data);
  expect(mocks.post).toHaveBeenCalledWith("/organization/directory/sync-user", { subjectId: "oidc-guid", directoryUserName: "account" });
  expect(result.message).toContain("1 eski dizin üyeliği kaldırıldı");
});
