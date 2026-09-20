import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CredentialsForm } from "./credentials-form";
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("opens development archive without including credentials and clears inputs", () => {
  render(<CredentialsForm destination="/documents" enabled />);
  fireEvent.change(screen.getByLabelText("Kullanıcı adı"), { target: { value: "demo" } });
  fireEvent.change(screen.getByLabelText("Parola"), { target: { value: "test-value" } });
  const form = screen.getByRole("form") as HTMLFormElement;
  expect([...new FormData(form).entries()]).toEqual([]);
  fireEvent.submit(form);
  expect(push).toHaveBeenCalledWith("/documents");
  expect((screen.getByLabelText("Parola") as HTMLInputElement).value).toBe("");
});
it("does not grant access when development identity is unavailable", () => {
  render(<CredentialsForm destination="/" enabled={false} />);
  fireEvent.submit(screen.getByRole("form"));
  expect(push).not.toHaveBeenCalled();
});
