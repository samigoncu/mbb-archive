import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MalatyaApiPanel } from "./malatya-api-panel";
import type { MalatyaApiSettings } from "../api/malatya-api-actions";

vi.mock("../api/malatya-api-actions", () => ({
  saveMalatyaApiSettingsAction: vi.fn(),
  testMalatyaApiConnectionAction: vi.fn(),
  switchDirectorySourceAction: vi.fn(),
  testMalatyaSmsAction: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(cleanup);

const mockSettings: MalatyaApiSettings = {
  baseUrl: "https://api.malatya.bel.tr",
  userName: "test_admin",
  hasPassword: true,
  smsProvider: "MBB",
  isDirectorySyncEnabled: true,
  isLdapEnabled: false,
  lastTestedAt: "2026-09-20T20:00:00Z",
  lastTestStatus: "Başarılı (Token alındı)",
  version: 1,
  updatedAt: "2026-09-20T20:00:00Z",
  updatedBy: "operator",
};

it("Malatya API ayarlarını ve dizin aktiflik durumunu görüntüler", () => {
  render(<MalatyaApiPanel initial={mockSettings} canManage />);

  expect(screen.getByText("Malatya API Dizin Modu Aktif")).toBeTruthy();
  expect(screen.getByDisplayValue("https://api.malatya.bel.tr")).toBeTruthy();
  expect(screen.getByDisplayValue("test_admin")).toBeTruthy();
  expect(screen.getByDisplayValue("MBB")).toBeTruthy();
  expect(screen.getByText("Bağlantıyı Test Et (Token Al)")).toBeTruthy();
  expect(screen.getByText("SMS & OTP Gönderim Testi")).toBeTruthy();
});

it("yetkisiz kullanıcıda butonları devre dışı bırakır", () => {
  render(<MalatyaApiPanel initial={mockSettings} canManage={false} />);

  const saveBtn = screen.getByRole("button", { name: "API Ayarlarını Kaydet" });
  expect(saveBtn).toHaveProperty("disabled", true);

  const testBtn = screen.getByRole("button", { name: "Bağlantıyı Test Et (Token Al)" });
  expect(testBtn).toHaveProperty("disabled", true);
});

it("klasik LDAP aktifken karşılıklı dışlama kartını doğru görüntüler", () => {
  render(
    <MalatyaApiPanel
      initial={{
        ...mockSettings,
        isDirectorySyncEnabled: false,
        isLdapEnabled: true,
      }}
      canManage
    />
  );

  expect(screen.getByText("Klasik LDAP Aktif (API Pasif)")).toBeTruthy();
});

