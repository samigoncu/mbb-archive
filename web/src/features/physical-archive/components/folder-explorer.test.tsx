import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api-client";
import { getFolders } from "../api/get-folders";
import { FolderExplorer } from "./folder-explorer";

vi.mock("../api/get-folders", () => ({ getFolders: vi.fn() }));
afterEach(cleanup);
describe("Folder explorer", () => {
  it("groups real folders by file plan and preserves folder search when opening one", async () => {
    vi.mocked(getFolders).mockResolvedValue({ page: 2, pageSize: 25, totalCount: 60, items: [{
      id: "folder-a", title: "Ruhsat Dosyası", barcode: "2026-001", filePlanCode: "757.03", documentCount: 2,
      locationId: "shelf", locationName: "Raf", locationCode: "R1", status: "Available", createdAt: "2026-09-05", lastMovedAt: null,
    }] });
    render(await FolderExplorer({ selectedId: "folder-a", page: 2, query: "Ruhsat" }));
    expect(getFolders).toHaveBeenCalledWith(2, 25, { title: "Ruhsat" });
    expect(screen.getByText("757.03")).toBeTruthy();
    const folder = screen.getByRole("link", { name: /Ruhsat Dosyası/ });
    expect(folder.getAttribute("href")).toBe("/dosya-islemleri/folder-a?folderPage=2&folderSearch=Ruhsat");
    expect(folder.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Sonraki" }).getAttribute("href")).toBe("/documents?folderPage=3&folderSearch=Ruhsat");
  });
  it("shows an empty search result without fake folders", async () => {
    vi.mocked(getFolders).mockResolvedValue({ page: 1, pageSize: 25, totalCount: 0, items: [] });
    render(await FolderExplorer({ query: "yok" }));
    expect(screen.getByText("Klasör bulunamadı.")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Klasör sayfaları" })).toBeNull();
  });
  it("does not break the document list for users without folder access", async () => {
    vi.mocked(getFolders).mockRejectedValue(new ApiError("Forbidden", 403));
    render(await FolderExplorer({}));
    expect(screen.getByText("Klasörleri görüntüleme yetkiniz yok.")).toBeTruthy();
  });
});
