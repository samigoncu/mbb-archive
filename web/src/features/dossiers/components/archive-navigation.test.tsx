import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArchiveNavigation } from "./archive-navigation";
import type { ArchiveUnit } from "../model/dossier";
import type { FilePlanTree } from "@/features/classification/model/classification";
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
beforeEach(() => push.mockClear());
afterEach(cleanup);
const units: ArchiveUnit[] = [{ id: "bid", name: "Bilgi İşlem Dairesi Başkanlığı", path: "/BID/", parentId: null, isActive: true, isPrimary: true, canManageDocuments: true, canManagePhysical: true }];
const trees: FilePlanTree[] = [{ id: "plan", code: "SDP", name: "Standart Dosya Planı", version: "2026", authority: "Test", effectiveFrom: "2026-01-01", effectiveTo: null, items: [
  { id: "p", parentId: null, code: "TEST", title: "Ana konu", level: 1, isActive: true, isSelectable: false },
  { id: "c", parentId: "p", code: "TEST.01", title: "Alt konu", level: 2, isActive: true, isSelectable: true },
] }];
describe("Birim arşivi gezinmesi", () => {
  it.each(["/documents", "/dosya-islemleri"])("%s birim seçimi düğme gerektirmeden eski seçimleri temizleyerek gezinir", (basePath) => {
    render(<ArchiveNavigation units={[...units, { ...units[0], id: "other", name: "Diğer birim" }]} trees={trees} ownerUnitId="bid" filePlanCode="TEST.01" basePath={basePath} />);
    expect(screen.queryByRole("button", { name: "Birimi aç" })).toBeNull();
    fireEvent.change(screen.getByRole("combobox", { name: "Daire başkanlığı / birim" }), { target: { value: "other" } });
    expect(push).toHaveBeenCalledWith(`${basePath}?ownerUnitId=other`, { scroll: false });
  });
  it("başlık satırını çoğaltmadan klasör dalları açılıp kapanabilir", () => {
    render(<ArchiveNavigation units={units} trees={trees} ownerUnitId="bid" />);
    expect(screen.getAllByRole("link", { name: "TEST · Ana konu" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "TEST · Ana konu alt başlıklarını daralt" }));
    expect(screen.queryByRole("link", { name: "TEST.01 · Alt konu" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "TEST · Ana konu alt başlıklarını genişlet" }));
    expect(screen.getByRole("link", { name: "TEST.01 · Alt konu" })).toBeTruthy();
  });
  it("boş birim için ortak planı varmış gibi göstermez", () => {
    render(<ArchiveNavigation units={units} trees={[]} ownerUnitId="bid" />);
    expect(screen.getByText("Bu birim kapsamında gösterilecek dosya planı başlığı yok.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "TEST · Ana konu" })).toBeNull();
  });
  it("SDP alt konusuna geçerken birim kapsamını korur", () => {
    render(<ArchiveNavigation units={units} trees={trees} ownerUnitId="bid" filePlanCode="TEST.01" />);
    const link = screen.getByRole("link", { name: "TEST.01 · Alt konu" });
    expect(link.getAttribute("href")).toBe("/documents?ownerUnitId=bid&filePlanCode=TEST.01");
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("option", { name: units[0].name })).toBeTruthy();
  });
  it("fiziksel görünüm aynı birim ve konu yolunu kullanır", () => {
    render(<ArchiveNavigation units={units} trees={trees} ownerUnitId="bid" basePath="/dosya-islemleri" />);
    expect(screen.getByRole("link", { name: "TEST.01 · Alt konu" }).getAttribute("href")).toBe("/dosya-islemleri?ownerUnitId=bid&filePlanCode=TEST.01");
  });
});
