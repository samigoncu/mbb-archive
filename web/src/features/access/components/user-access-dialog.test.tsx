import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { UserAccessDialog } from "./user-access-dialog";
import { loadSubjectAccessAction, saveSubjectAccessAction } from "../api/subject-access-actions";
import type { ManagedRole } from "../model/administration";
import type { OrganizationUnit } from "@/features/organization/model/unit-plans";

vi.mock("../api/subject-access-actions", () => ({
  loadSubjectAccessAction: vi.fn(),
  saveSubjectAccessAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const roles: ManagedRole[] = [
  { id: "r1", code: "arsiv-sorumlusu", name: "Arşiv sorumlusu", permissions: ["documents.read"], memberCount: 2, version: "1" },
  { id: "r2", code: "okuyucu", name: "Okuyucu", permissions: ["search.read"], memberCount: 5, version: "1" },
];

const units: OrganizationUnit[] = [
  { id: "u1", code: "BID", name: "Bilgi İşlem", shortName: null, parentId: null, path: "/BID/", isActive: true, memberCount: 3 },
  { id: "u2", code: "BID-YZ", name: "Yazılım", shortName: null, parentId: "u1", path: "/BID/YZ/", isActive: true, memberCount: 1 },
];

function open() {
  vi.mocked(loadSubjectAccessAction).mockResolvedValue({
    subject: { subjectId: "ali.veli", roleIds: ["r1"], permissions: ["documents.read"], version: "7" },
    memberships: [{ id: "m1", subjectId: "ali.veli", unitId: "u1", unitCode: "BID", unitName: "Bilgi İşlem", isPrimary: true, source: "manual", createdAt: "2026-01-01" }],
  });
  render(<UserAccessDialog subjectId="ali.veli" roles={roles} units={units} open onOpenChange={() => {}} />);
}

it("shows the user's roles and unit memberships together", async () => {
  open();
  // Roller sekmesi açılışta gelir; mevcut rol işaretli olmalı.
  const role = await screen.findByRole("checkbox", { name: /Arşiv sorumlusu/ });
  expect((role as HTMLInputElement).checked).toBe(true);
  expect((screen.getByRole("checkbox", { name: /Okuyucu/ }) as HTMLInputElement).checked).toBe(false);

  fireEvent.click(screen.getByRole("button", { name: /Organizasyon birimleri/ }));
  expect((await screen.findByRole("checkbox", { name: /Bilgi İşlem/ }) as HTMLInputElement).checked).toBe(true);
  expect((screen.getByRole("checkbox", { name: /Yazılım/ }) as HTMLInputElement).checked).toBe(false);
});

it("saves role and unit changes in one call with the concurrency version", async () => {
  vi.mocked(saveSubjectAccessAction).mockResolvedValue({ subject: null, memberships: [] });
  open();

  fireEvent.click(await screen.findByRole("checkbox", { name: /Okuyucu/ }));
  fireEvent.click(screen.getByRole("button", { name: /Organizasyon birimleri/ }));
  fireEvent.click(await screen.findByRole("checkbox", { name: /Yazılım/ }));
  fireEvent.click(screen.getByRole("button", { name: "Kaydet" }));

  await waitFor(() => expect(saveSubjectAccessAction).toHaveBeenCalled());
  const payload = vi.mocked(saveSubjectAccessAction).mock.calls[0][0];
  expect(payload.version).toBe("7");
  expect([...payload.roleIds].sort()).toEqual(["r1", "r2"]);
  expect([...payload.unitIds].sort()).toEqual(["u1", "u2"]);
  expect(payload.primaryUnitId).toBe("u1");
});

it("keeps a save failure visible instead of closing silently", async () => {
  vi.mocked(saveSubjectAccessAction).mockResolvedValue({ subject: null, memberships: [], error: "Kayıt başka bir yönetici tarafından değiştirildi." });
  open();

  fireEvent.click(await screen.findByRole("button", { name: "Kaydet" }));
  expect((await screen.findByRole("alert")).textContent).toContain("başka bir yönetici");
});
