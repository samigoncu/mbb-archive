import { expect, it } from "vitest";
import { scanScopeProblem } from "./scan-scope-notice";
import { emptyScanContext, type ScanContext } from "../model/scan-context";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import type { DigitalDossier } from "@/features/dossiers/model/dossier";

const folder: FolderListItem = {
  id: "f1", ownerUnitId: "unit", digitalDossierId: "d1", barcode: "F-1", title: "Klasör",
  filePlanCode: "934.01", locationId: "raf", locationCode: "R1", locationName: "Raf 1",
  status: "Available", documentCount: 0, createdAt: "2026-01-01", lastMovedAt: null,
};

const dossier: DigitalDossier = {
  id: "d1", ownerUnitId: "unit", ownerUnitName: "Bilgi İşlem", filePlanId: "eski",
  filePlanItemId: "eski-konu", filePlanVersion: "2019.1", filePlanCode: "934.01",
  filePlanTitle: "İhale Dosyaları", title: "Dosyalama Testi B", year: 2026, documentCount: 1,
};

function context(overrides: Partial<ScanContext> = {}): ScanContext {
  return { ...emptyScanContext("unit"), ...overrides };
}

it("reports nothing when both the folder and the dossier are in scope", () => {
  expect(scanScopeProblem(context({ folders: [folder], dossiers: [dossier] }), folder, dossier)).toBeNull();
});

it("explains a retired plan version instead of sending the user to a blank page", () => {
  // Klasör kapsamda ama dijital dosya pasif SDP sürümüne bağlı — eskiden 404'tü.
  const problem = scanScopeProblem(context({ folders: [folder], dossiers: [] }), folder, dossier);
  expect(problem?.title).toContain("SDP sürümü yürürlükte değil");
  expect(problem?.description).toContain("2019.1");
  expect(problem?.action?.href).toContain("/documents?ownerUnitId=unit");
});

it("names the folder status when the folder cannot receive documents", () => {
  const onLoan = { ...folder, status: "OnLoan" as const };
  const problem = scanScopeProblem(context(), onLoan, null);
  expect(problem?.title).toContain("tarama yapılamaz");
  expect(problem?.description).toContain("Ödünçte");
});

it("points at the unit plan assignment when the folder topic is not in force", () => {
  const problem = scanScopeProblem(context({ classifications: [] }), folder, null);
  expect(problem?.title).toContain("dosya planı konusu yürürlükte değil");
  expect(problem?.action?.href).toBe("/tanimlamalar/birimler");
});
