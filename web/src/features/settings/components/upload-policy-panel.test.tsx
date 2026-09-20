import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { UploadPolicyPanel } from "./upload-policy-panel";
import { saveUploadPolicy } from "../api/upload-policy";
vi.mock("../api/upload-policy", () => ({ saveUploadPolicy: vi.fn() }));
const initial = { maxFileSizeMb: 200, maxUploadBytes: 209715200, maximumAllowedMb: 2048, version: 1, updatedBy: "system", updatedAt: null };
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it("saves the selected limit with concurrency version and shows the persisted result", async () => {
  vi.mocked(saveUploadPolicy).mockResolvedValue({ data: { ...initial, maxFileSizeMb: 512, version: 2 } });
  render(<UploadPolicyPanel initial={initial} canManage />);
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "512" } });
  fireEvent.click(screen.getByRole("button", { name: "Yükleme sınırını kaydet" }));
  await screen.findByRole("status");
  expect(saveUploadPolicy).toHaveBeenCalledWith(512, 1);
});
it("preserves the error from a conflicting administrator edit", async () => {
  vi.mocked(saveUploadPolicy).mockResolvedValue({ error: "Ayar değişti. Sayfayı yenileyin." });
  render(<UploadPolicyPanel initial={initial} canManage />);
  fireEvent.click(screen.getByRole("button"));
  expect((await screen.findByRole("alert")).textContent).toContain("Ayar değişti");
  expect(screen.queryByRole("status")).toBeNull();
});
it("does not offer a write control without admin permission", () => {
  render(<UploadPolicyPanel initial={initial} canManage={false} />);
  expect(screen.queryByRole("button")).toBeNull();
  expect((screen.getByRole("spinbutton") as HTMLInputElement).disabled).toBe(true);
});
