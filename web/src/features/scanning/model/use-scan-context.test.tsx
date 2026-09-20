import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadScanContextAction } from "../api/scan-context-action";
import { context } from "./scan-context.fixtures";
import type { ScanContextResult } from "./scan-context";
import { useScanContext } from "./use-scan-context";
vi.mock("../api/scan-context-action", () => ({ loadScanContextAction: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
describe("Birim değişikliğinde tarama seçimleri", () => {
  it("eski birimin tüm seçeneklerini hemen temizler; geç gelen yanıtı yeni birime karıştırmaz", async () => {
    let first!: (value: ScanContextResult) => void;
    let second!: (value: ScanContextResult) => void;
    vi.mocked(loadScanContextAction).mockImplementation(id => new Promise(resolve => { if (id === "other") first = resolve; else second = resolve; }));
    const { result } = renderHook(() => useScanContext(context(), "digital-bid"));
    expect(result.current.dossierId).toBe("digital-bid");
    act(() => { void result.current.changeUnit("other"); });
    expect(result.current.dossierId).toBe(""); expect(result.current.selectedClassification).toBe("");
    expect(result.current.context.dossiers).toEqual([]); expect(result.current.loading).toBe(true);
    act(() => { void result.current.changeUnit("third"); });
    await act(async () => { second({ context: context("third") }); });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { first({ context: context("other") }); });
    expect(result.current.ownerUnitId).toBe("third"); expect(result.current.context.ownerUnitId).toBe("third");
  });
  it("dijital dosyanın sınıflandırmasını devralır ve uyuşmayan fiziksel klasörü gizler", () => {
    const { result } = renderHook(() => useScanContext(context()));
    act(() => result.current.changeDossier("digital-bid"));
    expect(result.current.classification?.itemId).toBe("topic"); expect(result.current.folders).toEqual([]);
    act(() => result.current.changeDossier(""));
    act(() => result.current.changeFolder("physical-bid"));
    expect(result.current.classification?.itemId).toBe("physical-topic");
  });
  it("yetki veya yükleme hatasında önceki birimin seçeneklerini geri göstermez", async () => {
    vi.mocked(loadScanContextAction).mockResolvedValue({ error: "Yetki kaldırıldı" });
    const { result } = renderHook(() => useScanContext(context()));
    await act(async () => result.current.changeUnit("other"));
    expect(result.current.error).toBe("Yetki kaldırıldı"); expect(result.current.context.classifications).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
