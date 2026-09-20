import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AuditJournal } from "./audit-journal";
import type { AuditEvent } from "../model/audit";

afterEach(cleanup);
const event: AuditEvent = {
  sequence: 1, messageId: "event-id", eventName: "access.document-viewed.v1",
  documentId: "document-id", actor: "subject-id", actorDisplayName: "Ayşe Yılmaz",
  resourceType: "document", resourceId: "document-id", resourceName: "Satın Alma Yazısı",
  resourceUrl: "/documents/document-id", outcome: "succeeded",
  occurredAt: "2026-09-06T09:00:00Z", receivedAt: "2026-09-06T09:00:00Z",
  previousHash: null, entryHash: "a".repeat(64),
};

describe("AuditJournal", () => {
  it("shows who opened which document with a readable outcome and keeps identifiers in details", () => {
    render(<AuditJournal events={[event]} />);
    expect(screen.getByRole("link", { name: "Ayşe Yılmaz" }).getAttribute("href")).toContain("actor=subject-id");
    expect(screen.getByRole("link", { name: "Satın Alma Yazısı" }).getAttribute("href")).toBe("/documents/document-id");
    expect(screen.getByText("Belge görüntülendi")).toBeTruthy();
    expect(screen.getByText("Başarılı")).toBeTruthy();
    expect(screen.getByText("subject-id").closest("details")?.open).toBe(false);
    expect(screen.getByText("access.document-viewed.v1").closest("details")?.open).toBe(false);
  });

  it("does not offer an inaccessible document link or fabricate its name", () => {
    render(<AuditJournal events={[{ ...event, resourceName: null, resourceUrl: null }]} />);
    expect(screen.getByText("Belge adı bulunamadı veya erişiminiz yok")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Satın Alma Yazısı" })).toBeNull();
  });

  it("distinguishes missing historical identity from system processing", () => {
    render(<AuditJournal events={[{ ...event, actor: null, actorDisplayName: null },
      { ...event, sequence: 2, actor: null, actorDisplayName: null, eventName: "processing.started.v1", outcome: null }]} />);
    expect(screen.getByText("Kullanıcı bilgisi kaydedilmemiş")).toBeTruthy();
    expect(screen.getByText("Sistem işlemi")).toBeTruthy();
    expect(screen.getByText("Olay kaydı")).toBeTruthy();
  });
});
