import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { StoragePanel } from "./storage-panel";
import { formatBytes, type StorageStatus } from "../model/storage";

afterEach(cleanup);

const base: StorageStatus = {
  provider: "Local",
  location: "/data/originals",
  objectCount: 14,
  storedBytes: 307747697,
  referenceCount: 26,
  deduplicatedBytes: 53655010,
  worm: { enabled: false, mode: "Governance", retentionDays: 3650, supported: false },
  volume: { root: "/data/originals", totalBytes: 1000, availableBytes: 500, usedPercent: 50 },
  staging: { root: "/data/staging", fileCount: 0, bytes: 0 },
  isReachable: true,
  problem: null,
};

it("nesne sayısını, yeri ve tekilleştirme kazancını gösterir", () => {
  render(<StoragePanel status={base} />);
  expect(screen.getByText("/data/originals")).toBeTruthy();
  expect(screen.getByText(/14 · /)).toBeTruthy();
  expect(screen.getByText("Tekilleştirme kazancı")).toBeTruthy();
});

it("depoya erişilemediğinde uyarır", () => {
  render(<StoragePanel status={{ ...base, isReachable: false, problem: "connection refused" }} />);
  const alerts = screen.getAllByRole("alert");
  expect(alerts.some(node => /erişilemiyor/.test(node.textContent ?? ""))).toBe(true);
  expect(screen.getByText("connection refused")).toBeTruthy();
});

it("birim dolmak üzereyken uyarır", () => {
  // Disk dolduğunda yeni belge yüklenemez; uyarı eşiği aşılınca görünmeli.
  render(<StoragePanel status={{ ...base, volume: { root: "/data", totalBytes: 100, availableBytes: 5, usedPercent: 95 } }} />);
  expect(screen.getAllByRole("alert").some(node => /%95 dolu/.test(node.textContent ?? ""))).toBe(true);
});

it("yetki yoksa açıklayıcı bir mesaj gösterir", () => {
  render(<StoragePanel status={null} />);
  expect(screen.getByRole("alert").textContent).toContain("operations.read");
});

it("bayt değerlerini okunur birime çevirir", () => {
  expect(formatBytes(512)).toBe("512 B");
  expect(formatBytes(1024 * 1024)).toBe("1 MB");
});
