import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchWorkspace } from "./search-workspace";
import { parseConditions } from "../model/conditions";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const fields = [
  { key: "title", label: "Belge başlığı" },
  { key: "metadata:evrak.konu", label: "Evrak / Konu" },
];

describe("Search workspace", () => {
  beforeEach(() => push.mockClear());

  it("submits a simple keyword search without advanced conditions", () => {
    render(
      <SearchWorkspace
        initialQuery=""
        initialConditions={[]}
        initialMode="basic"
        fields={fields}
        hasSearch={false}
      >
        {null}
      </SearchWorkspace>,
    );
    fireEvent.change(screen.getByLabelText("Anahtar kelimeler"), {
      target: { value: "ruhsat" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ara" }));
    expect(push).toHaveBeenCalledWith("/arama?mode=basic&q=ruhsat");
  });

  it("submits an unrestricted search across all documents when keywords and dates are empty", () => {
    render(
      <SearchWorkspace
        initialQuery=""
        initialConditions={[]}
        initialMode="basic"
        fields={fields}
        hasSearch={true}
      >
        {null}
      </SearchWorkspace>,
    );
    const searchButton = screen.getByRole("button", { name: "Ara" }) as HTMLButtonElement;
    expect(searchButton.disabled).toBe(false);
    fireEvent.click(searchButton);
    expect(push).toHaveBeenCalledWith("/arama?mode=basic");
  });

  it("submits a date-only simple search and clears dates on reset", () => {
    render(
      <SearchWorkspace
        initialQuery=""
        initialConditions={[]}
        initialMode="basic"
        fields={fields}
        hasSearch={false}
      >
        {null}
      </SearchWorkspace>,
    );
    fireEvent.change(screen.getByLabelText("Başlangıç tarihi"), {
      target: { value: "2026-09-01" },
    });
    fireEvent.change(screen.getByLabelText("Bitiş tarihi"), {
      target: { value: "2026-09-05" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Basit arama" }));
    const params = new URL(push.mock.calls[0][0], "http://localhost")
      .searchParams;
    expect(params.get("from")).toBe("2026-09-01");
    expect(params.get("to")).toBe("2026-09-05");
    expect(params.get("dateField")).toBe("ingestedAt");
    expect(params.has("q")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Sıfırla" }));
    expect(
      (screen.getByLabelText("Başlangıç tarihi") as HTMLInputElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText("Bitiş tarihi") as HTMLInputElement).value,
    ).toBe("");
  });

  it("preserves a draft across modes and submits multiple real conditions", () => {
    render(
      <SearchWorkspace
        initialQuery="imar"
        initialConditions={[]}
        initialMode="basic"
        fields={fields}
        hasSearch={false}
      >
        {null}
      </SearchWorkspace>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Filtre ekle" }));
    fireEvent.change(screen.getByLabelText("Koşul 1 değeri"), {
      target: { value: "ruhsat" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gelişmiş" }));
    expect(
      (screen.getByLabelText("Koşul 1 değeri") as HTMLInputElement).value,
    ).toBe("ruhsat");
    fireEvent.click(screen.getByRole("button", { name: "Filtre ekle" }));
    fireEvent.change(screen.getByLabelText("Koşul 2 işleci"), {
      target: { value: "notContains" },
    });
    fireEvent.change(screen.getByLabelText("Koşul 2 değeri"), {
      target: { value: "taslak" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Gelişmiş arama" }));
    const url = new URL(push.mock.calls[0][0], "http://localhost");
    expect(url.searchParams.get("mode")).toBe("advanced");
    expect(url.searchParams.get("q")).toBe("imar");
    expect(JSON.parse(url.searchParams.get("conditions")!)).toEqual([
      { field: "metadata:evrak.konu", operator: "contains", value: "ruhsat" },
      {
        field: "metadata:evrak.konu",
        operator: "notContains",
        value: "taslak",
      },
    ]);
    expect(url.searchParams.has("page")).toBe(false);
  });

  it("removes a condition and clears the query and URL filters on reset", () => {
    render(
      <SearchWorkspace
        initialQuery="imar"
        initialConditions={[
          { field: "title", operator: "equals", value: "Belge" },
        ]}
        initialMode="advanced"
        fields={fields}
        hasSearch
      >
        {null}
      </SearchWorkspace>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Koşul 1 kaldır" }));
    expect(screen.queryByLabelText("Koşul 1 değeri")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sıfırla" }));
    expect(push).toHaveBeenCalledWith("/arama?mode=advanced");
    expect(
      (screen.getByLabelText("Anahtar kelimeler") as HTMLInputElement).value,
    ).toBe("");
  });

  it("rejects malformed bookmark filters instead of silently broadening a search", () => {
    expect(parseConditions("[").error).toBeTruthy();
    expect(
      parseConditions('[{"field":"_script","operator":"equals","value":"x"}]')
        .error,
    ).toBeTruthy();
    expect(
      parseConditions(
        '[{"field":"mimeType","operator":"contains","value":"pdf"}]',
      ).error,
    ).toBeTruthy();
  });
});
