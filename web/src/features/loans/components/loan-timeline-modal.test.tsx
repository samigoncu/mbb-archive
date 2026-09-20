import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LoanTimelineModal } from "./loan-timeline-modal";
import type { LoanDetailsItem } from "../model/loan";

afterEach(cleanup);

const mockLoan: LoanDetailsItem = {
  id: "loan-1",
  folderId: "folder-1",
  folderBarcode: "KL-2026-99",
  folderTitle: "Fen İşleri İhale Dosyası",
  filePlanCode: "100.01",
  borrowerSubjectId: "mehmet.oz",
  checkedOutBy: "ahmet.arsiv",
  purpose: "Müfettiş İncelemesi",
  status: "Returned",
  checkedOutAt: "2026-09-01T10:00:00Z",
  dueAt: "2026-09-15T23:59:59Z",
  returnedAt: "2026-09-10T14:30:00Z",
  returnNote: "Dosya tüm ekleriyle eksiksiz teslim alındı.",
  isOverdue: false,
  daysOverdue: 0,
};

describe("LoanTimelineModal", () => {
  it("opens modal and displays complete lifecycle timeline including return note", () => {
    render(<LoanTimelineModal loan={mockLoan} />);

    // Trigger button
    const trigger = screen.getByRole("button", { name: /Tarihçe/i });
    fireEvent.click(trigger);

    // Header and basic info
    expect(screen.getByText("Zimmet Süreç Tarihçesi & Tutanak")).toBeTruthy();
    expect(screen.getAllByText(/KL-2026-99/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Fen İşleri İhale Dosyası/).length).toBeGreaterThanOrEqual(1);

    // Timeline steps
    expect(screen.getByText("1. Zimmet Başlangıcı (Ödünç Verildi)")).toBeTruthy();
    expect(screen.getAllByText(/ahmet\.arsiv/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/mehmet\.oz/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Müfettiş İncelemesi/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("3. İade & Arşive Kabul İşlemi")).toBeTruthy();
    expect(screen.getByText(/Dosya tüm ekleriyle eksiksiz teslim alındı/)).toBeTruthy();
  });

  it("switches to official handover receipt tab and renders branding settings", () => {
    const customBranding = {
      siteTitle: "MBB Kurumsal Arşiv",
      institutionName: "T.C. MERSİN BÜYÜKŞEHİR BELEDİYESİ",
      description: "Açıklama",
      departmentName: "Yazı İşleri ve Kararlar Dairesi Başkanlığı · Arşiv Şube Müdürlüğü",
      logo: { kind: "logo" as const, source: "default" as const, url: null, fileName: null, sizeBytes: null, updatedAt: null },
      favicon: { kind: "favicon" as const, source: "default" as const, url: null, fileName: null, sizeBytes: null, updatedAt: null },
      loginImage: { kind: "login" as const, source: "default" as const, url: null, fileName: null, sizeBytes: null, updatedAt: null },
      version: 1,
      updatedBy: "admin",
      updatedAt: null,
    };

    render(<LoanTimelineModal loan={mockLoan} branding={customBranding} />);

    fireEvent.click(screen.getByRole("button", { name: /Tarihçe/i }));
    fireEvent.click(screen.getByRole("button", { name: "Resmi Tutanak" }));

    expect(screen.getByText("T.C. MERSİN BÜYÜKŞEHİR BELEDİYESİ")).toBeTruthy();
    expect(screen.getByText("Yazı İşleri ve Kararlar Dairesi Başkanlığı · Arşiv Şube Müdürlüğü")).toBeTruthy();
    expect(screen.getByText(/FİZİKSEL ARŞİV DOSYASI TESLİM-TESELLÜM TUTANAĞI/)).toBeTruthy();
    expect(screen.getByText(/TESLİM EDEN \(Arşiv Görevlisi\)/)).toBeTruthy();
    expect(screen.getAllByText(/ahmet\.arsiv/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/TESLİM ALAN \(Personel\)/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Yazdır/i })).toBeTruthy();
  });
});
