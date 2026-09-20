import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentWorkspace } from "./document-workspace";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock("./document-version-upload", () => ({ DocumentVersionUpload: ({ currentVersion }: { currentVersion: number }) => <div>Yükleme için güncel sürüm: {currentVersion}</div> }));
vi.mock("./document-filing-editor", () => ({ DocumentFilingEditor: () => null }));
vi.mock("./document-protection", () => ({ DocumentProtection: () => null }));
vi.mock("./document-version-text", () => ({ DocumentVersionText: ({version}:{version:number}) => <div>Seçili sürüm OCR: {version}</div> }));
vi.mock("./office-preview", () => ({ OfficePreview: ({ versionNumber }: { versionNumber: number }) => <div>Office sürümü: {versionNumber}</div> }));
vi.mock("@/features/collections/components/document-collections", () => ({ DocumentCollections: () => null }));
vi.mock("@/features/geo/components/document-geo-relations", () => ({ DocumentGeoRelations: () => null }));
afterEach(cleanup);
const props = {
  details: { id: "doc", title: "İmzalı belge", status: "Draft", versionCount: 2, createdAt: "2026-09-07", archivedAt: null },
  integrity: { documentId: "doc", versionNumber: 2, mimeType: "application/pdf", sizeBytes: 2048, sha256Hash: "latest-hash" },
  versions: [
    { versionNumber: 2, mimeType: "application/pdf", sizeBytes: 2048, sha256Hash: "latest-hash", createdAt: "2026-09-07", createdBy: "admin", reason: "İmzalı" },
    { versionNumber: 1, mimeType: "image/png", sizeBytes: 1024, sha256Hash: "old-hash", createdAt: "2026-09-06", createdBy: "admin", reason: "İlk nüsha" },
  ],
  text: { documentId: "doc", hasText: true, text: "LATEST OCR TEXT", characterCount: 15, isTruncated: false },
  folders: [], collections: { memberOf: [], available: [] }, geo: { relations: [], entities: [] }, audit: [], canUpload: true,
  selectedVersion: 1, contentUrl: "/api/documents/doc/content?version=1", downloadUrl: "/api/documents/doc/content?download=true&version=1",
};
describe("Version selection", () => {
  it("uses the explicitly selected current version after cancellation", () => {
    render(<DocumentWorkspace {...props} details={{...props.details,currentVersionNumber:1}} versions={[{...props.versions[0],cancelledAt:"2026-09-07",cancelledBy:"admin",cancellationReason:"Yanlış"},props.versions[1]]} />);
    expect(screen.getByText("Yükleme için güncel sürüm: 1")).toBeTruthy();
    expect(screen.queryByRole("link", {name:"Güncel sürüme dön"})).toBeNull();
    expect(screen.getByText("İptal edildi")).toBeTruthy();
  });
  it("marks the selected version and uses its MIME, hash, content and download", () => {
    const { container } = render(<DocumentWorkspace {...props} />);
    const selected = screen.getByRole("link", { name: "v1 sürümünü görüntüle" });
    expect(selected.getAttribute("aria-current")).toBe("true");
    expect(selected.getAttribute("href")).toBe("/documents/doc?version=1");
    expect(container.querySelector("img")?.getAttribute("src")).toBe(props.contentUrl);
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByText("old-hash")).toBeTruthy();
    expect(screen.queryByText("latest-hash")).toBeNull();
    expect(screen.getByRole("link", { name: "v1 orijinalini indir" }).getAttribute("href")).toBe(props.downloadUrl);
    expect(screen.getByRole("link", { name: "Güncel sürüme dön" }).getAttribute("href")).toBe("/documents/doc?version=2");
    expect(screen.getByText("Yükleme için güncel sürüm: 2")).toBeTruthy();
  });
  it("does not label current OCR as historical content", () => {
    render(<DocumentWorkspace {...props} />);
    fireEvent.click(screen.getByRole("tab", { name: "OCR" }));
    expect(screen.getByText("Seçili sürüm OCR: 1")).toBeTruthy();
    expect(screen.queryByText("LATEST OCR TEXT")).toBeNull();
  });
  it("returns to the latest PDF and keeps version links available in the history tab", () => {
    const { container } = render(<DocumentWorkspace {...props} selectedVersion={2} contentUrl="/api/documents/doc/content?version=2" downloadUrl="/api/documents/doc/content?download=true&version=2" />);
    expect(container.querySelector("iframe")?.getAttribute("src")).toContain("version=2");
    expect(screen.queryByRole("link", { name: "Güncel sürüme dön" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Sürümler" }));
    expect(screen.getAllByRole("link", { name: "v1 sürümünü görüntüle" })).toHaveLength(2);
  });
  it("selects the historical Office conversion by version number", () => {
    render(<DocumentWorkspace {...props} versions={[props.versions[0], { ...props.versions[1], mimeType: "application/vnd.oasis.opendocument.text" }]} />);
    expect(screen.getByText("Office sürümü: 1")).toBeTruthy();
  });
});
