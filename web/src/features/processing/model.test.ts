import { expect, it, describe } from "vitest";
import { ocrStatus, getProcessingProgress, type ProcessingItem } from "./model";

const job = {
  id: "job-1",
  documentId: "doc-1",
  documentVersionId: "ver-1",
  stage: "Completed",
  mimeType: "application/pdf",
  createdAt: "2026-09-20T10:00:00Z",
  completedAt: "2026-09-20T10:05:00Z",
  failureCode: null,
  failureDetail: null,
  pageCount: 5,
  hasText: true,
  hasPdf: true,
  hasOcr: false,
} as ProcessingItem;

it("does not call native text extraction OCR or failure", () => {
  expect(ocrStatus(job)).toBe("Metin doğrudan çıkarıldı");
  expect(ocrStatus({ ...job, hasOcr: true })).toBe("Tamamlandı");
});

it("distinguishes waiting from failed OCR and downstream errors", () => {
  expect(ocrStatus({ ...job, stage: "OcrRequested", hasText: false })).toBe("Sonuç bekleniyor");
  expect(ocrStatus({ ...job, stage: "Failed", failureCode: "ocr.failed" })).toBe("Başarısız");
  expect(ocrStatus({ ...job, stage: "Failed", hasOcr: true, failureCode: "index.failed" })).toBe("Tamamlandı");
});

describe("getProcessingProgress", () => {
  it("computes 100% for completed jobs", () => {
    const progress = getProcessingProgress(job);
    expect(progress.percentage).toBe(100);
    expect(progress.isComplete).toBe(true);
    expect(progress.isFailed).toBe(false);
    expect(progress.stageName).toBe("Tamamlandı");
    expect(progress.stepIndex).toBe(5);
  });

  it("computes percentage for queuing and inspection stages", () => {
    expect(getProcessingProgress({ ...job, stage: "Queued" })).toMatchObject({
      percentage: 10,
      stageName: "Kuyrukta",
      variant: "queued",
    });

    expect(getProcessingProgress({ ...job, stage: "PdfInspectionRequested" })).toMatchObject({
      percentage: 30,
      stageName: "PDF İnceleme",
      variant: "in_progress",
    });
  });

  it("computes percentage for text extraction and OCR stages", () => {
    expect(getProcessingProgress({ ...job, stage: "TextExtractionRequested" })).toMatchObject({
      percentage: 50,
      stageName: "Metin Çıkarımı",
      variant: "in_progress",
    });

    expect(getProcessingProgress({ ...job, stage: "OcrRequested", hasText: false })).toMatchObject({
      percentage: 55,
      stageName: "OCR İşleme",
    });

    expect(getProcessingProgress({ ...job, stage: "OcrRequested", hasText: true })).toMatchObject({
      percentage: 65,
      stageName: "OCR İşleme",
    });
  });

  it("computes percentage for indexing and quality control", () => {
    expect(getProcessingProgress({ ...job, stage: "AwaitingIndex" })).toMatchObject({
      percentage: 85,
      stageName: "Arama İndeksleme",
    });

    expect(getProcessingProgress({ ...job, stage: "AwaitingQualityControl" })).toMatchObject({
      percentage: 92,
      stageName: "Kalite Kontrol",
    });
  });

  it("distinguishes early failure from late failure and handles unsupported", () => {
    expect(getProcessingProgress({ ...job, stage: "Failed", hasText: false, hasOcr: false })).toMatchObject({
      percentage: 35,
      isFailed: true,
      variant: "failed",
    });

    expect(getProcessingProgress({ ...job, stage: "Failed", hasText: true })).toMatchObject({
      percentage: 85,
      isFailed: true,
      variant: "failed",
    });

    expect(getProcessingProgress({ ...job, stage: "Unsupported" })).toMatchObject({
      percentage: 0,
      isFailed: true,
      variant: "unsupported",
    });
  });
});

