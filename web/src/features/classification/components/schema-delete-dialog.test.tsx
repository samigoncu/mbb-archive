import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SchemaDeleteDialog } from "./schema-delete-dialog";
import { deleteMetadataSchemaAction } from "../api/metadata-actions";

vi.mock("../api/metadata-actions", () => ({
  deleteMetadataSchemaAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("id=s1"),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("opens confirmation dialog and deletes draft schema", async () => {
  vi.mocked(deleteMetadataSchemaAction).mockResolvedValue({ ok: true });
  const onDeleted = vi.fn();

  render(
    <SchemaDeleteDialog
      schemaId="s1"
      name="İmar Taslağı"
      version={1}
      fieldCount={2}
      onDeleted={onDeleted}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: /Taslağı Sil/i }));
  expect(await screen.findByText(/İmar Taslağı/i)).toBeTruthy();
  expect(screen.getByText(/2 adet alanı/i)).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Şemayı Sil" }));

  await waitFor(() => {
    expect(deleteMetadataSchemaAction).toHaveBeenCalledWith("s1");
    expect(onDeleted).toHaveBeenCalled();
  });
});

it("displays error message when deletion fails on server", async () => {
  vi.mocked(deleteMetadataSchemaAction).mockResolvedValue({
    error: "Yayımlanmış üstveri şeması silinemez.",
  });

  render(
    <SchemaDeleteDialog
      schemaId="s1"
      name="İmar Taslağı"
      version={1}
      fieldCount={0}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: /Taslağı Sil/i }));
  fireEvent.click(await screen.findByRole("button", { name: "Şemayı Sil" }));

  expect((await screen.findByRole("alert")).textContent).toContain(
    "Yayımlanmış üstveri şeması silinemez"
  );
});

