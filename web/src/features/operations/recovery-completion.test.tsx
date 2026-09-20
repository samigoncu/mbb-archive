import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { RecoveryCompletion } from "./recovery-completion";
vi.mock("./actions", () => ({ operationsAction: vi.fn() }));
afterEach(cleanup);
it("blocks successful completion when the measured recovery target is exceeded and allows failed evidence recording", () => {
  render(<RecoveryCompletion id="drill" targetRpo={5} targetRto={30} />);
  fireEvent.change(screen.getByLabelText("Ölçülen RPO (dakika)"), { target: { value: "6" } });
  expect((screen.getByRole("button", { name: "Tatbikat sonucunu kaydet" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("alert").textContent).toContain("hedefi aşıldı");
  fireEvent.change(screen.getByLabelText("Tatbikat sonucu"), { target: { value: "false" } });
  expect((screen.getByRole("button", { name: "Tatbikat sonucunu kaydet" }) as HTMLButtonElement).disabled).toBe(false);
  expect((screen.getByLabelText("Kanıt referansı") as HTMLInputElement).required).toBe(true);
});
