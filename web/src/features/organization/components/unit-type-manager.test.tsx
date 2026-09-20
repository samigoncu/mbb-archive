import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { UnitTypeManager } from "./unit-type-manager";
import type { UnitTypeItem } from "../model/unit-type";

vi.mock("../api/unit-type-actions", () => ({
  saveUnitTypeAction: vi.fn(),
  setUnitTypeActiveAction: vi.fn(),
  deleteUnitTypeAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
afterEach(cleanup);

const types: UnitTypeItem[] = [
  { code: "Directorate", name: "Daire Başkanlığı", level: 3, canHoldMembers: true, isActive: true, isBuiltIn: true, unitCount: 8, allowedChildCodes: ["Branch"] },
  { code: "Branch", name: "Şube Müdürlüğü", level: 4, canHoldMembers: true, isActive: true, isBuiltIn: true, unitCount: 11, allowedChildCodes: [] },
  { code: "WorkingGroup", name: "Çalışma Grubu", level: 5, canHoldMembers: false, isActive: false, isBuiltIn: false, unitCount: 0, allowedChildCodes: [] },
];

it("seviyeleri derinlik ve kullanım sayısıyla listeler", () => {
  render(<UnitTypeManager types={types} canManage />);
  expect(screen.getByText("Daire Başkanlığı")).toBeTruthy();
  expect(screen.getByText("8 birim")).toBeTruthy();
  expect(screen.getByText("11 birim")).toBeTruthy();
});

it("yalnız kademe taşıyan seviyeyi ayırt eder", () => {
  render(<UnitTypeManager types={types} canManage />);
  expect(screen.getByText("yalnız kademe")).toBeTruthy();
  expect(screen.getByText("pasif")).toBeTruthy();
});

it("kurulum seviyesini ve kullanımdaki seviyeyi silmeye izin vermez", () => {
  render(<UnitTypeManager types={types} canManage />);
  // Silme düğmesi yalnız kurulumla gelmeyen ve hiç birimi olmayan seviyede çıkar.
  expect(screen.queryByRole("button", { name: /Daire Başkanlığı seviyesini sil/ })).toBeNull();
  expect(screen.getByRole("button", { name: /Çalışma Grubu seviyesini sil/ })).toBeTruthy();
});

it("yetkisi olmayana düzenleme aracı göstermez", () => {
  render(<UnitTypeManager types={types} canManage={false} />);
  expect(screen.queryByRole("button", { name: /Seviye ekle/ })).toBeNull();
  expect(screen.getByText("Daire Başkanlığı")).toBeTruthy();
});
