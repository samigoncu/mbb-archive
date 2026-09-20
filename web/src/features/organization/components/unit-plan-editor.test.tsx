import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnitPlanEditor } from "./unit-plan-editor";
import { tree } from "@/features/scanning/model/scan-context.fixtures";
vi.mock("../api/unit-actions", () => ({ saveUnitPlans: vi.fn() }));
afterEach(cleanup);
describe("Birim SDP eşleştirmesi", () => {
  it("aramayla gizlenen seçimi de kaydetme yükünde tutar", () => {
    const { container } = render(<UnitPlanEditor trees={[tree]} initial={{ unitId: "bid", revision: 7, items: [] }} disabled={false} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "TEST.01 · Birim konusu" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "TEST.02" } });
    expect(screen.queryByRole("checkbox", { name: "TEST.01 · Birim konusu" })).toBeNull();
    const data = new FormData(container.querySelector("form")!);
    expect(data.getAll("planItem")).toEqual(["plan|topic"]);
    expect(data.get("unitId")).toBe("bid"); expect(data.get("revision")).toBe("7");
  });
  it("pasif veya yetkisiz birimde kaydetme düğmesini kapatır", () => {
    render(<UnitPlanEditor trees={[tree]} initial={{ unitId: "bid", revision: 1, items: [] }} disabled />);
    expect((screen.getByRole("button", { name: "SDP eşleştirmesini kaydet" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
