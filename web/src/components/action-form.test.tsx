import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionForm } from "./action-form";

afterEach(cleanup);

describe("ActionForm submission", () => {
  it("sends the unit deletion form on button click after required confirmation", async () => {
    const action = vi.fn().mockResolvedValue({ status: "success", message: "Birim kaldırıldı." });
    render(<ActionForm action={action} label="Birimi sil">
      <input type="hidden" name="operation" value="delete" />
      <input type="hidden" name="unitId" value="unused-unit" />
      <label><input type="checkbox" name="confirm" required />Silme onayı</label>
    </ActionForm>);
    fireEvent.click(screen.getByRole("button", { name: "Birimi sil" }));
    expect(action).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Silme onayı" }));
    fireEvent.click(screen.getByRole("button", { name: "Birimi sil" }));
    await waitFor(() => expect(action).toHaveBeenCalledOnce());
    const data = action.mock.calls[0][1] as FormData;
    expect(data.get("operation")).toBe("delete");
    expect(data.get("unitId")).toBe("unused-unit");
    expect(data.get("confirm")).toBe("on");
    expect((await screen.findByRole("status")).textContent).toBe("Birim kaldırıldı.");
  });

  it("displays a failed API action without reporting success", async () => {
    const action = vi.fn().mockResolvedValue({ status: "error", message: "Üyesi bulunan birim silinemez." });
    render(<ActionForm action={action} label="Birimi sil">{null}</ActionForm>);
    fireEvent.click(screen.getByRole("button", { name: "Birimi sil" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Üyesi bulunan birim silinemez.");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
