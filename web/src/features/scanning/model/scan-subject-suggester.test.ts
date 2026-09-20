import { describe, expect, it } from "vitest";
import {
  isGenericScannerFilename,
  formatFilenameToTitle,
  detectSemanticSubjectFromKeywords,
  generateStandardArchiveFilename,
  inspectFileTextForSubject,
  suggestDocumentSubject,
  buildSubjectChips,
  renameScannedFile,
} from "./scan-subject-suggester";

describe("scan-subject-suggester", () => {
  describe("isGenericScannerFilename", () => {
    it("identifies standard scanner generic patterns", () => {
      expect(isGenericScannerFilename("scan_0001.pdf")).toBe(true);
      expect(isGenericScannerFilename("scan.pdf")).toBe(true);
      expect(isGenericScannerFilename("tarama_12.pdf")).toBe(true);
      expect(isGenericScannerFilename("IMG_20260920_123456.jpg")).toBe(true);
      expect(isGenericScannerFilename("doc001.pdf")).toBe(true);
      expect(isGenericScannerFilename("belge_1.pdf")).toBe(true);
      expect(isGenericScannerFilename("page_1.pdf")).toBe(true);
      expect(isGenericScannerFilename("sayfa-02.pdf")).toBe(true);
      expect(isGenericScannerFilename("20260920123456.pdf")).toBe(true);
      expect(isGenericScannerFilename("123.pdf")).toBe(true);
      expect(isGenericScannerFilename("adsiz.pdf")).toBe(true);
      expect(isGenericScannerFilename("untitled.pdf")).toBe(true);
    });

    it("identifies meaningful custom filenames as non-generic", () => {
      expect(isGenericScannerFilename("kamulastirma_karari_2026.pdf")).toBe(false);
      expect(isGenericScannerFilename("meclis_karar_ozeti.pdf")).toBe(false);
      expect(isGenericScannerFilename("imar_plan_tadilat_dilekcesi.pdf")).toBe(false);
      expect(isGenericScannerFilename("sozlesmeli_personel_giris.pdf")).toBe(false);
    });
  });

  describe("detectSemanticSubjectFromKeywords", () => {
    it("detects ADSL/Internet bills with month (e.g. ADSL ekim)", () => {
      expect(detectSemanticSubjectFromKeywords("ADSL ekim.pdf")).toBe(
        "Ekim Ayı ADSL / İnternet Hizmet Faturası",
      );
      expect(detectSemanticSubjectFromKeywords("fiber_internet_kasim.pdf")).toBe(
        "Kasım Ayı ADSL / İnternet Hizmet Faturası",
      );
      expect(detectSemanticSubjectFromKeywords("ttnet_fatura.pdf")).toBe(
        "ADSL / İnternet Hizmet Faturası",
      );
    });

    it("detects water and utility bills (MASKİ, elektrik vb.)", () => {
      expect(detectSemanticSubjectFromKeywords("maski_su_ekim.pdf")).toBe(
        "Ekim Ayı Su ve Kanalizasyon Hizmet Faturası",
      );
      expect(detectSemanticSubjectFromKeywords("tedas_elektrik_eylul.pdf")).toBe(
        "Eylül Ayı Elektrik Tesis Abonelik Faturası",
      );
      expect(detectSemanticSubjectFromKeywords("aksa_dogalgaz_mart.pdf")).toBe(
        "Mart Ayı Doğalgaz Tesis Abonelik Faturası",
      );
    });

    it("detects payroll and HR documents with month", () => {
      expect(detectSemanticSubjectFromKeywords("maas_bordro_ekim.pdf")).toBe(
        "Ekim Ayı Personel Maaş Bordrosu",
      );
    });

    it("detects municipal decisions and permits", () => {
      expect(detectSemanticSubjectFromKeywords("meclis_karari_152.pdf")).toBe(
        "Belediye Meclis Kararı (No: 152)",
      );
      expect(detectSemanticSubjectFromKeywords("yapi_ruhsat_belgesi.pdf")).toBe(
        "Yapı Ruhsatı ve İskan Belgesi",
      );
    });
  });

  describe("generateStandardArchiveFilename", () => {
    it("converts title to clean ASCII underscore filename with extension", () => {
      const filename = generateStandardArchiveFilename(
        "Ekim Ayı ADSL / İnternet Hizmet Faturası",
        "ADSL ekim.pdf",
      );
      expect(filename).toBe("Ekim_Ayi_ADSL_Internet_Hizmet_Faturasi.pdf");
    });

    it("prefixes with classification code when provided", () => {
      const filename = generateStandardArchiveFilename(
        "Meclis Kararı",
        "scan_0001.pdf",
        "805.01",
      );
      expect(filename).toBe("805.01_Meclis_Karari.pdf");
    });

    it("preserves original extension", () => {
      const filename = generateStandardArchiveFilename(
        "Maaş Bordrosu",
        "bordro.jpg",
      );
      expect(filename).toBe("Maas_Bordrosu.jpg");
    });
  });

  describe("renameScannedFile", () => {
    it("creates a new File object with updated name and preserves content", async () => {
      const original = new File(["test content"], "old_name.pdf", {
        type: "application/pdf",
      });
      const renamed = renameScannedFile(original, "new_name.pdf");
      expect(renamed.name).toBe("new_name.pdf");
      expect(renamed.type).toBe("application/pdf");
      expect(await renamed.text()).toBe("test content");
    });
  });

  describe("formatFilenameToTitle", () => {
    it("formats underscored/hyphenated filename into Turkish title case", () => {
      expect(formatFilenameToTitle("kamulastirma_tespit_raporu_2026.pdf")).toBe(
        "Kamulastirma Tespit Raporu 2026",
      );
      expect(formatFilenameToTitle("imar-plani-degisiklik-talep.pdf")).toBe(
        "İmar Plani Degisiklik Talep",
      );
    });

    it("returns empty string for generic scanner filenames", () => {
      expect(formatFilenameToTitle("scan_0001.pdf")).toBe("");
      expect(formatFilenameToTitle("tarama_1.pdf")).toBe("");
    });
  });

  describe("inspectFileTextForSubject", () => {
    it("extracts Konu line from PDF text", async () => {
      const samplePdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (Resmi Yazi) >>\nstream\nKONU: İmar Planı Değişikliği Hakkında\nendstream`;
      const file = new File([samplePdfContent], "scan_0001.pdf", {
        type: "application/pdf",
      });

      const extracted = await inspectFileTextForSubject(file);
      expect(extracted).toBe("İmar Planı Değişikliği Hakkında");
    });

    it("extracts Meclis Kararı pattern with decision number", async () => {
      const samplePdfContent = `%PDF-1.4\nT.C. MALATYA BÜYÜKŞEHİR BELEDİYESİ MECLİS KARARI\nKARAR NO : 2026/142\n`;
      const file = new File([samplePdfContent], "tarama_2.pdf", {
        type: "application/pdf",
      });

      const extracted = await inspectFileTextForSubject(file);
      expect(extracted).toBe("Meclis Kararı (Karar No: 2026/142)");
    });

    it("detects Encümen Kararı when present", async () => {
      const samplePdfContent = `%PDF-1.4\nMALATYA BÜYÜKŞEHİR BELEDİYESİ ENCÜMEN KARARI\n`;
      const file = new File([samplePdfContent], "doc_01.pdf", {
        type: "application/pdf",
      });

      const extracted = await inspectFileTextForSubject(file);
      expect(extracted).toBe("Belediye Encümen Kararı");
    });

    it("detects Dilekçe pattern", async () => {
      const samplePdfContent = `%PDF-1.4\nMALATYA BÜYÜKŞEHİR BELEDİYE BAŞKANLIĞI MAKAMINA\n`;
      const file = new File([samplePdfContent], "scan.pdf", {
        type: "application/pdf",
      });

      const extracted = await inspectFileTextForSubject(file);
      expect(extracted).toBe("Vatandaş Talep Dilekçesi");
    });
  });

  describe("suggestDocumentSubject", () => {
    it("detects semantic keywords like 'ADSL ekim' and suggests proper title and filename", async () => {
      const file = new File(["dummy content"], "ADSL ekim.pdf", {
        type: "application/pdf",
      });
      const res = await suggestDocumentSubject({ file });
      expect(res.subject).toBe("Ekim Ayı ADSL / İnternet Hizmet Faturası");
      expect(res.suggestedFilename).toBe("Ekim_Ayi_ADSL_Internet_Hizmet_Faturasi.pdf");
      expect(res.source).toBe("semantic");
    });

    it("prefers extracted content subject over generic filename", async () => {
      const pdf = new File(
        ["%PDF-1.4\nKONU: Kamulaştırma Bedel Tespiti\n"],
        "scan_0001.pdf",
        { type: "application/pdf" },
      );
      const res = await suggestDocumentSubject({
        file: pdf,
        classificationTitle: "Kamulaştırma",
      });
      expect(res.subject).toBe("Kamulaştırma Bedel Tespiti");
      expect(res.source).toBe("content");
    });

    it("uses formatted filename when filename is meaningful", async () => {
      const file = new File(["dummy"], "imar_komisyon_raporu.pdf", {
        type: "application/pdf",
      });
      const res = await suggestDocumentSubject({
        file,
        classificationTitle: "İmar İşleri",
      });
      expect(res.subject).toBe("İmar Komisyon Raporu");
      expect(res.source).toBe("filename");
    });

    it("falls back to SDP classification title when filename is generic and content empty", async () => {
      const file = new File(["dummy"], "scan_0002.pdf", {
        type: "application/pdf",
      });
      const res = await suggestDocumentSubject({
        file,
        classificationTitle: "Meclis Kararları",
        classificationCode: "805.01",
      });
      expect(res.subject).toBe("Meclis Kararları Evrakı");
      expect(res.suggestedFilename).toBe("805.01_Meclis_Kararlari_Evraki.pdf");
      expect(res.source).toBe("classification");
    });

    it("falls back to digital dossier title when SDP title not provided", async () => {
      const file = new File(["dummy"], "scan_0003.pdf", {
        type: "application/pdf",
      });
      const res = await suggestDocumentSubject({
        file,
        dossierTitle: "2026/45 İhale Dosyası",
      });
      expect(res.subject).toBe("2026/45 İhale Dosyası Üst Yazısı");
      expect(res.source).toBe("dossier");
    });
  });

  describe("buildSubjectChips", () => {
    it("provides contextual and standard quick templates", () => {
      const chips = buildSubjectChips({
        classificationTitle: "Kamulaştırma Kararları",
        dossierTitle: "2026/10 Kamulaştırma",
        detectedSubject: "Bedel Artırım Talebi",
      });

      expect(chips).toContain("Bedel Artırım Talebi");
      expect(chips).toContain("Kamulaştırma Kararları");
      expect(chips).toContain("2026/10 Kamulaştırma Üst Yazısı");
      expect(chips).toContain("Resmi Yazı / Üst Yazı");
      expect(chips).toContain("Talep Dilekçesi");
    });
  });
});
