import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LinkedDocumentTitle } from "./linked-document-title";

afterEach(cleanup);
describe("Linked document title", () => {
  const id = "dce2ccad-2b64-43bd-b9c9-d40ab3d94945";
  it("shows the real title while retaining the stable ID in the link", () => {
    render(<LinkedDocumentTitle document={{ id, details: { id, title: "İmar ruhsatı", status: "Active", versionCount: 1, createdAt: "2026-09-05", archivedAt: null } }} />);
    expect(screen.getByRole("link", { name: "İmar ruhsatı" }).getAttribute("href")).toBe(`/documents/${id}`);
    expect(screen.queryByText(id)).toBeNull();
  });
  it("does not render an inaccessible document as a clickable UUID", () => {
    render(<LinkedDocumentTitle document={{ id, details: null }} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Belgeye erişilemiyor")).toBeTruthy();
    expect(screen.queryByText(id)).toBeNull();
  });
});
