import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OfficePreview } from "./office-preview";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("Office PDF preview", () => {
  it("pins status, PDF and PDF download to the requested historical version", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "Ready" }) });
    vi.stubGlobal("fetch", request);
    const { container } = render(<OfficePreview documentId="doc" title="Office v1" versionNumber={1} />);
    await screen.findByText("PDF kopyasını indir");
    expect(request.mock.calls[0][0]).toBe("/api/documents/doc/preview?version=1");
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe("/api/documents/doc/preview?version=1&content=true");
    expect(screen.getByRole("link").getAttribute("href")).toBe("/api/documents/doc/preview?version=1&content=true&download=true");
  });
  it("opens the derived PDF and offers a separate PDF download", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok:true, json:async()=>({status:"Ready",pageCount:2}) }));
    const { container } = render(<OfficePreview documentId="doc" title="Office belge" />);
    await screen.findByText("PDF kopyasını indir");
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe("/api/documents/doc/preview?content=true");
    expect(screen.getByRole("link").getAttribute("href")).toBe("/api/documents/doc/preview?content=true&download=true");
  });
  it("shows a conversion failure without claiming a PDF is available", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok:true,json:async()=>({status:"Failed",message:"PDF oluşturulamadı."})}));
    const {container}=render(<OfficePreview documentId="doc" title="Office belge" />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.queryByText("PDF kopyasını indir")).toBeNull();
  });
  it("reports authorization or connection failures rather than polling forever", async () => {
    const request=vi.fn().mockResolvedValue({ok:false,status:403});vi.stubGlobal("fetch",request);
    render(<OfficePreview documentId="private-doc" title="Office belge" />);
    await waitFor(()=>expect(screen.getByRole("alert").textContent).toContain("alınamadı"));
    expect(request).toHaveBeenCalledTimes(1);
  });
});
