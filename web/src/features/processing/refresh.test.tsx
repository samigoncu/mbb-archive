import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ProcessingRefresh } from "./refresh";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

describe("ProcessingRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders manual refresh button and calls router.refresh on click", () => {
    render(<ProcessingRefresh />);
    const button = screen.getByRole("button", { name: /şimdi yenile/i });
    expect(button).toBeTruthy();

    fireEvent.click(button);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("renders live status indicator and interval choices", () => {
    render(<ProcessingRefresh hasActiveJobs={true} />);
    expect(screen.getByText(/Canlı Akış/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "4s" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "10s" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Durdur" })).toBeTruthy();
  });

  it("changes interval when duration button is clicked", () => {
    render(<ProcessingRefresh />);
    const stopButton = screen.getByRole("button", { name: "Durdur" });
    fireEvent.click(stopButton);
    expect(screen.getByText(/Otomatik yenileme kapalı/i)).toBeTruthy();

    const fastButton = screen.getByRole("button", { name: "4s" });
    fireEvent.click(fastButton);
    expect(screen.getByText(/Canlı Akış/i)).toBeTruthy();
  });

  it("refreshes on window focus event", () => {
    render(<ProcessingRefresh />);
    expect(refreshMock).not.toHaveBeenCalled();

    // Trigger window focus
    fireEvent(window, new Event("focus"));
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
