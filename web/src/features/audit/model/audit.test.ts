import { describe, expect, it } from "vitest";

import {
  auditChainLinks,
  auditEventLabel,
  auditEventTimestamp,
  type AuditEvent,
} from "./audit";

function event(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    sequence: 1,
    messageId: "01a06586-0000-7000-8000-000000000001",
    eventName: "documents.created.v1",
    documentId: null,
    occurredAt: "2026-09-04T10:00:00+00:00",
    receivedAt: "2026-09-04T10:00:02+00:00",
    previousHash: null,
    entryHash: "a".repeat(64),
    ...overrides,
  };
}

describe("auditEventLabel", () => {
  it("translates known event names", () => {
    expect(auditEventLabel("documents.created.v1")).toBe("Belge kaydı açıldı");
    expect(auditEventLabel("access.document-downloaded.v1")).toBe(
      "Belge indirildi",
    );
  });

  it("shows an unknown event name as-is instead of hiding it", () => {
    expect(auditEventLabel("geo.relation-created.v1")).toBe(
      "geo.relation-created.v1",
    );
  });
});

describe("auditEventTimestamp", () => {
  it("uses occurredAt when it is plausible", () => {
    expect(auditEventTimestamp(event())).toBe("2026-09-04T10:00:00+00:00");
  });

  it("falls back to receivedAt for legacy epoch rows", () => {
    const legacy = event({ occurredAt: "1970-01-01T00:00:00+00:00" });

    expect(auditEventTimestamp(legacy)).toBe("2026-09-04T10:00:02+00:00");
  });

  it("falls back to receivedAt when occurredAt is unparseable", () => {
    const broken = event({ occurredAt: "not-a-date" });

    expect(auditEventTimestamp(broken)).toBe("2026-09-04T10:00:02+00:00");
  });
});

describe("auditChainLinks", () => {
  it("marks a matching previous hash as linked", () => {
    const links = auditChainLinks([
      event({ sequence: 2, previousHash: "aaa", entryHash: "bbb" }),
      event({ sequence: 1, previousHash: "0".repeat(64), entryHash: "aaa" }),
    ]);

    expect(links.get(2)).toBe("linked");
  });

  it("marks a mismatching previous hash as broken", () => {
    const links = auditChainLinks([
      event({ sequence: 2, previousHash: "zzz", entryHash: "bbb" }),
      event({ sequence: 1, previousHash: "0".repeat(64), entryHash: "aaa" }),
    ]);

    expect(links.get(2)).toBe("broken");
  });

  /**
   * Süzgeçli listede önceki halka gelmemiş olabilir; bunu "kopuk" göstermek
   * yanlış alarm üretir.
   */
  it("marks a missing predecessor as unchecked rather than broken", () => {
    const links = auditChainLinks([
      event({ sequence: 9, previousHash: "aaa", entryHash: "bbb" }),
    ]);

    expect(links.get(9)).toBe("unchecked");
  });

  it("treats the first entry of the chain as linked", () => {
    const links = auditChainLinks([
      event({ sequence: 1, previousHash: "0".repeat(64), entryHash: "aaa" }),
    ]);

    expect(links.get(1)).toBe("linked");
  });
});
