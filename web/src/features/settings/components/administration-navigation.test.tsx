import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AdministrationNavigation } from "./administration-navigation";
import type { CurrentUser } from "@/features/access/model/current-user";
const location = vi.hoisted(() => ({ pathname: "/tanimlamalar/birimler" }));
vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }));
const user: CurrentUser = { subject: "user", roles: [], permissions: ["organization.read"], isAuthenticated: true, isBootstrapAdministrator: false, authenticationMode: "Jwt" };
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });
it("only shows permitted definitions and identifies the active nested page", () => {
  location.pathname = "/tanimlamalar/birimler";
  render(<AdministrationNavigation user={user} />);
  const navigation = within(screen.getByRole("navigation", { name: "Tanım yönetimi" }));
  expect(navigation.getByRole("link", { name: /Kurum birimleri/ }).getAttribute("aria-current")).toBe("page");
  expect(navigation.queryByRole("link", { name: /Roller ve yetkiler/ })).toBeNull();
  expect(navigation.queryByRole("link", { name: /Dosya planları/ })).toBeNull();
});
it("preserves section deep links and updates selection when another section is chosen", () => {
  location.pathname = "/ayarlar"; window.history.replaceState(null, "", "/ayarlar#tarayici");
  render(<AdministrationNavigation user={{ ...user, isBootstrapAdministrator: true }} />);
  const nav = within(screen.getByRole("navigation", { name: "Ayar bölümleri" }));
  expect(nav.getByRole("link", { name: /Tarayıcı bağlantısı/ }).getAttribute("aria-current")).toBe("location");
  const upload = nav.getByRole("link", { name: /Yükleme ve OCR/ }); fireEvent.click(upload);
  expect(upload.getAttribute("aria-current")).toBe("location");
  expect(upload.getAttribute("href")).toBe("/ayarlar#yukleme");
});

it("keeps CBS under the definitions menu, not system settings", () => {
  location.pathname = "/tanimlamalar";
  const { container } = render(<AdministrationNavigation user={{ ...user, isBootstrapAdministrator: true }} />);
  const definitions = within(screen.getByRole("navigation", { name: "Tanım yönetimi" }));
  expect(definitions.getByRole("link", { name: /CBS servisleri/ }).getAttribute("href")).toBe("/tanimlamalar/cbs");
  // Ayarlar şeridinde artık CBS kalemi yok.
  expect(within(container).queryByRole("link", { name: /CBS bağlantısı/ })).toBeNull();
});
it("does not invent admin access when identity is unavailable", () => {
  location.pathname = "/tanimlamalar";
  render(<AdministrationNavigation user={null} />);
  expect(screen.queryByRole("link", { name: /Roller ve yetkiler/ })).toBeNull();
  expect(screen.getByText(/Menü yetkileri alınamadı/)).toBeTruthy();
});
it("leaves user administration and system settings to the sidebar", () => {
  location.pathname = "/tanimlamalar";
  const { container } = render(<AdministrationNavigation user={{ ...user, isBootstrapAdministrator: true }} />);
  const navigation = within(screen.getByRole("navigation", { name: "Tanım yönetimi" }));
  expect(navigation.queryByRole("link", { name: /yetki yönetimi/i })).toBeNull();
  // Bölüm içinde Tanımlar ↔ Sistem ayarları geçişi kalmadı.
  expect(within(container).queryByRole("link", { name: "Sistem ayarları" })).toBeNull();
  expect(navigation.getByRole("link", { name: /Kurum birimleri/ })).toBeTruthy();
});
it("renders nothing on the user administration page itself", () => {
  location.pathname = "/tanimlamalar/yetkiler";
  const { container } = render(<AdministrationNavigation user={{ ...user, isBootstrapAdministrator: true }} />);
  expect(container.firstChild).toBeNull();
});
