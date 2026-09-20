import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentFullscreen } from "./document-fullscreen";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const props = { documentId: "doc", title: "Eski nüsha", version: 1, contentUrl: "/api/documents/doc/content?version=1" };

describe("Document full screen", () => {
  it("opens the selected PDF version and returns with the close control", async () => {
    render(<DocumentFullscreen {...props} kind="pdf" />);
    fireEvent.click(screen.getByRole("button", { name: "Tam ekran" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Eski nüsha — v1")).toBeTruthy();
    expect(dialog.querySelector("iframe")?.getAttribute("src")).toBe(props.contentUrl);
    fireEvent.click(within(dialog).getByRole("button", { name: "Tam ekrandan çık" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("fits the selected image and supports Escape", async () => {
    render(<DocumentFullscreen {...props} kind="image" />);
    fireEvent.click(screen.getByRole("button", { name: "Tam ekran" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("img").getAttribute("src")).toBe(props.contentUrl);
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("opens the version-specific Office PDF after it is ready", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "Ready" }) }));
    render(<DocumentFullscreen {...props} kind="office" />);
    fireEvent.click(screen.getByRole("button", { name: "Tam ekran" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("PDF kopyasını indir");
    expect(dialog.querySelector("iframe")?.getAttribute("src")).toBe("/api/documents/doc/preview?version=1&content=true");
  });
});
