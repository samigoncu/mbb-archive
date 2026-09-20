import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { UserAdministration } from "./user-administration";
import type { ManagedRole, ManagedSubject } from "../model/administration";
import type { DirectoryUser } from "@/features/organization/model/directory-user";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(cleanup);

const roles: ManagedRole[] = [
  { id: "r1", code: "arsiv-sorumlusu", name: "Arşiv sorumlusu", permissions: ["documents.read"], memberCount: 1, version: "1" },
];

const directory: DirectoryUser[] = [
  {
    subjectId: "ali.veli", displayName: "Ali Veli", email: "ali.veli@mbb.gov.tr", title: "Arşiv memuru",
    unitReference: "Bilgi İşlem", isActive: true, source: "Directory",
    createdAt: "2026-09-19T08:00:00Z", lastSyncedAt: "2026-09-19T08:00:00Z", lastSeenAt: "2026-09-19T08:00:00Z",
  },
  {
    subjectId: "yeni.kullanici", displayName: "Yeni Kullanıcı", email: null, title: null,
    unitReference: null, isActive: false, source: "Directory",
    createdAt: "2026-09-19T09:00:00Z", lastSyncedAt: null, lastSeenAt: "2026-09-19T09:00:00Z",
  },
];

const subjects: ManagedSubject[] = [
  { subjectId: "ali.veli", roleIds: ["r1"], permissions: ["documents.read"], version: "1" },
  { subjectId: "yeni.kullanici", roleIds: [], permissions: [], version: "1" },
];

function show(pendingOnly = false) {
  render(<UserAdministration
    base="/tanimlamalar/yetkiler"
    roles={roles}
    units={[]}
    subjects={{ items: subjects, totalCount: subjects.length }}
    directory={directory}
    search=""
    pendingOnly={pendingOnly}
    page={1}
  />);
}

it("kullanıcıyı ham kimlik yerine adıyla gösterir", () => {
  show();
  expect(screen.getAllByText("Ali Veli").length).toBeGreaterThan(0);
  // Rol ve birim ataması kimliğe bağlı olduğu için kimlik de görünür kalmalı.
  expect(screen.getAllByText("ali.veli").length).toBeGreaterThan(0);
  expect(screen.getByText("ali.veli@mbb.gov.tr")).toBeTruthy();
});

it("rolü olmayan kullanıcıyı erişim bekliyor olarak işaretler", () => {
  show();
  expect(screen.getAllByText("Erişim bekliyor").length).toBe(1);
  // Dizinde kapatılan hesap listede ayırt edilebilmeli.
  expect(screen.getAllByText("Dizinde kapalı").length).toBe(1);
});

it("erişim bekleyen süzgecini bağlantıda korur", () => {
  show(true);
  const pending = screen.getByRole("link", { name: "Erişim bekleyen" });
  expect(pending.getAttribute("aria-current")).toBe("true");
  expect(pending.getAttribute("href")).toContain("durum=bekleyen");
  expect(screen.getByRole("link", { name: "Tümü" }).getAttribute("href")).not.toContain("durum=bekleyen");
});
