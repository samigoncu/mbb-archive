import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DossierWorkspaceTabs } from "./dossier-workspace-tabs";

describe("DossierWorkspaceTabs", () => {
  const folder = {
    id: "f-1",
    barcode: "KLASOR-001",
    title: "2026 Fen İşleri Yol Yapım Projesi",
    filePlanCode: "805.01",
    documentIds: ["d-1", "d-2"],
    ownerUnitId: "u-1",
    digitalDossierId: "dd-1",
  };

  const owner = {
    id: "u-1",
    code: "FEN",
    name: "Fen İşleri Dairesi Başkanlığı",
    path: "/FEN/",
    parentId: null,
    isActive: true,
    isPrimary: true,
    canManagePhysical: true,
    canManageDocuments: true,
  };

  const documents = [
    {
      id: "d-1",
      details: {
        id: "d-1",
        title: "Yol Yapım İhalesi Sözleşme Metni",
        status: "Archived",
        createdAt: "2026-03-01T10:00:00Z",
        archivedAt: "2026-03-01T10:00:00Z",
        versionCount: 2,
      },
    },
    {
      id: "d-2",
      details: {
        id: "d-2",
        title: "Encümen Kararı ve Onay Tutanağı",
        status: "Active",
        createdAt: "2026-03-05T12:00:00Z",
        archivedAt: null,
        versionCount: 1,
      },
    },
  ];

  it("renders documents tab by default and switches to cover sheet", () => {
    render(
      <DossierWorkspaceTabs
        folder={folder}
        owner={owner}
        documents={documents}
        page={1}
        totalPages={1}
        navigation={{ basePath: "/dosya-islemleri/f-1", folderPage: 1, folderSearch: "" }}
      />
    );

    expect(screen.getByText("Yol Yapım İhalesi Sözleşme Metni")).toBeDefined();
    expect(screen.getByText("Encümen Kararı ve Onay Tutanağı")).toBeDefined();

    const coverTab = screen.getByRole("button", { name: /Dosya Kapağı & Künye/i });
    fireEvent.click(coverTab);

    expect(screen.getByText("KLASOR-001")).toBeDefined();
    expect(screen.getByText("Fen İşleri Dairesi Başkanlığı")).toBeDefined();
    expect(screen.getByText("WORM & SHA-256 Korumalı")).toBeDefined();
  });

  it("evaluates checklist categories based on document titles", () => {
    render(
      <DossierWorkspaceTabs
        folder={folder}
        owner={owner}
        documents={documents}
        page={1}
        totalPages={1}
        navigation={{ basePath: "/dosya-islemleri/f-1", folderPage: 1, folderSearch: "" }}
      />
    );

    const checklistTab = screen.getByRole("button", { name: /Kontrol Listesi/i });
    fireEvent.click(checklistTab);

    expect(screen.getByText("İş / Proje Dosyası Eksik Evrak Kontrol Listesi")).toBeDefined();
    expect(screen.getByText(/Karar \/ Olur \/ Encümen Kararı/)).toBeDefined();
    expect(screen.getByText(/Sözleşme \/ Protokol \/ Şartname/)).toBeDefined();
  });
});
