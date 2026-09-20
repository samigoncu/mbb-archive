import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { SidebarProvider } from "./sidebar-context";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/documents",
  useRouter: () => ({ push: pushMock }),
}));

describe("Sidebar collapse toggle", () => {
  it("does not render collapse toggle in topbar or bottom of sidebar", () => {
    const { container } = render(
      <SidebarProvider>
        <AppSidebar user={null} />
        <AppTopbar />
      </SidebarProvider>
    );

    const header = container.querySelector("header");
    const topbarButtons = header?.querySelectorAll('button[aria-label="Menüyü Daralt"], button[aria-label="Menüyü Genişlet"]');
    expect(topbarButtons?.length ?? 0).toBe(0);

    // There should be only 1 desktop collapse button (in sidebar header) + 1 mobile toggle button
    const aside = container.querySelector("aside");
    const asideButtons = aside?.querySelectorAll("button");
    expect(asideButtons?.length).toBe(1);
  });

  it("toggles correctly using the header toggle button next to the logo", () => {
    const { container } = render(
      <SidebarProvider>
        <AppSidebar user={null} />
        <AppTopbar />
      </SidebarProvider>
    );

    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("w-64");
    expect(aside?.className).not.toContain("lg:w-[70px]");

    // Click collapse button in sidebar header
    const collapseButton = screen.getByRole("button", { name: "Menüyü Daralt" });
    fireEvent.click(collapseButton);

    expect(aside?.className).toContain("lg:w-[70px]");

    // Click expand button in sidebar header
    const expandButton = screen.getByRole("button", { name: "Menüyü Genişlet" });
    fireEvent.click(expandButton);

    expect(aside?.className).toContain("w-64");
    expect(aside?.className).not.toContain("lg:w-[70px]");
  });

  it("toggles correctly with keyboard shortcut Cmd+B / Ctrl+B", () => {
    const { container } = render(
      <SidebarProvider>
        <AppSidebar user={null} />
        <AppTopbar />
      </SidebarProvider>
    );

    const aside = container.querySelector("aside");
    expect(aside?.className).not.toContain("lg:w-[70px]");

    fireEvent.keyDown(window, { key: "b", ctrlKey: true });
    expect(aside?.className).toContain("lg:w-[70px]");

    fireEvent.keyDown(window, { key: "b", metaKey: true });
    expect(aside?.className).not.toContain("lg:w-[70px]");
  });
});

describe("Topbar search", () => {
  it("navigates to /arama?q=... when submitting search input", () => {
    pushMock.mockClear();
    render(<AppTopbar />);

    const input = screen.getByRole("searchbox", { name: "Genel arama" });
    fireEvent.change(input, { target: { value: "imar planı" } });
    fireEvent.submit(input.closest("form")!);

    expect(pushMock).toHaveBeenCalledWith("/arama?q=imar%20plan%C4%B1");
  });

  it("navigates to /arama when submitting empty search", () => {
    pushMock.mockClear();
    render(<AppTopbar />);

    const input = screen.getByRole("searchbox", { name: "Genel arama" });
    fireEvent.submit(input.closest("form")!);

    expect(pushMock).toHaveBeenCalledWith("/arama");
  });

  it("focuses search input on Cmd+K or Ctrl+K", () => {
    render(<AppTopbar />);

    const input = screen.getByRole("searchbox", { name: "Genel arama" });
    expect(document.activeElement).not.toBe(input);

    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(document.activeElement).toBe(input);
  });
});
