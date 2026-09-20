import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProcessingProgressBar } from "./processing-progress-bar";
import type { ProcessingItem } from "../model";

const sampleJob: ProcessingItem = {
  id: "job-101",
  documentId: "doc-101",
  documentVersionId: "ver-101",
  stage: "Completed",
  mimeType: "application/pdf",
  createdAt: "2026-09-20T10:00:00Z",
  completedAt: "2026-09-20T10:05:00Z",
  failureCode: null,
  failureDetail: null,
  pageCount: 12,
  hasText: true,
  hasPdf: true,
  hasOcr: true,
};

describe("ProcessingProgressBar", () => {
  it("renders 100% progress and stage for completed job", () => {
    render(<ProcessingProgressBar job={sampleJob} />);

    const progressbars = screen.getAllByRole("progressbar");
    expect(progressbars[0].getAttribute("aria-valuenow")).toBe("100");
    expect(screen.getAllByText("%100").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("İşlem başarıyla tamamlandı")).toBeTruthy();
  });

  it("renders intermediate percentage for in-progress stages like AwaitingIndex", () => {
    render(
      <ProcessingProgressBar
        job={{ ...sampleJob, stage: "AwaitingIndex", completedAt: null }}
      />
    );

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("85");
    expect(screen.getAllByText("%85").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Arama motoru indekslemesi bekleniyor")).toBeTruthy();
  });

  it("renders pipeline steps when enabled and hides when disabled", () => {
    const { rerender } = render(<ProcessingProgressBar job={sampleJob} showSteps={true} />);
    expect(screen.getByText("Kuyruk")).toBeTruthy();
    expect(screen.getByText("Ön İnceleme")).toBeTruthy();
    expect(screen.getByText("İndeksleme")).toBeTruthy();

    rerender(<ProcessingProgressBar job={sampleJob} showSteps={false} />);
    expect(screen.queryByText("Kuyruk")).toBeNull();
  });

  it("renders failure state properly", () => {
    render(
      <ProcessingProgressBar
        job={{
          ...sampleJob,
          stage: "Failed",
          failureDetail: "Karakter seti çözümlenemedi",
          hasOcr: false,
          hasText: false,
        }}
      />
    );

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("35");
    expect(screen.getByText("Karakter seti çözümlenemedi")).toBeTruthy();
  });
});
