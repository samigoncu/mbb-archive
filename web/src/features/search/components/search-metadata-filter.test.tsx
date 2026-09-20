import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MetadataSchemaDetail } from "@/features/classification/model/classification";

import { SearchMetadataFilter } from "./search-metadata-filter";

const push = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

afterEach(() => {
  cleanup();
  push.mockReset();
  searchParams = new URLSearchParams();
});

function schema(
  overrides: Partial<MetadataSchemaDetail> = {},
): MetadataSchemaDetail {
  return {
    id: "01a06586-0000-7000-8000-000000000001",
    key: "evrak-ustverisi",
    name: "Evrak Üstverisi",
    version: 1,
    status: "Published",
    fields: [
      {
        id: "evrak_no",
        key: "evrak_no",
        label: "Evrak No",
        fieldType: "Text",
        isRequired: true,
        isSearchable: true,
        isRepeatable: false,
        optionsJson: null,
      },
      {
        id: "dahili_not",
        key: "dahili_not",
        label: "Dahili Not",
        fieldType: "Text",
        isRequired: false,
        isSearchable: false,
        isRepeatable: false,
        optionsJson: null,
      },
    ],
    ...overrides,
  };
}

describe("SearchMetadataFilter", () => {
  /**
   * Arama projeksiyonu anahtarları `<şema>.<alan>` biçiminde saklar. Kısa
   * anahtar gönderildiğinde arama sessizce sıfır sonuç döndürüyordu.
   */
  it("qualifies the field key with the schema key", () => {
    render(<SearchMetadataFilter schemas={[schema()]} />);

    const option = screen.getByRole("option", {
      name: "Evrak No (Evrak Üstverisi)",
    }) as HTMLOptionElement;

    expect(option.value).toBe("evrak-ustverisi.evrak_no");
  });

  it("hides fields that are not indexed for search", () => {
    render(<SearchMetadataFilter schemas={[schema()]} />);

    expect(
      screen.queryByRole("option", { name: /Dahili Not/ }),
    ).not.toBeTruthy();
  });

  it("renders nothing when no schema has a searchable field", () => {
    const { container } = render(
      <SearchMetadataFilter schemas={[schema({ fields: [] })]} />,
    );

    expect(container.innerHTML).toBe("");
  });

  it("navigates with both parameters and resets paging", () => {
    searchParams = new URLSearchParams("q=hal+yolu&page=4");

    render(<SearchMetadataFilter schemas={[schema()]} />);

    fireEvent.change(screen.getByLabelText("Alan"), {
      target: { value: "evrak-ustverisi.evrak_no" },
    });
    fireEvent.change(screen.getByLabelText("Değer"), {
      target: { value: "E-2026-00145" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Uygula" }));

    const target = new URL(push.mock.calls[0][0] as string, "http://localhost");

    expect(target.searchParams.get("metadataKey")).toBe(
      "evrak-ustverisi.evrak_no",
    );
    expect(target.searchParams.get("metadataValue")).toBe("E-2026-00145");
    expect(target.searchParams.get("q")).toBe("hal yolu");
    expect(target.searchParams.has("page")).toBe(false);
  });

  /**
   * Yarım bırakılmış filtre uygulanmamalı; aksi halde backend anahtarsız
   * değerle çağrılır.
   */
  it("clears the filter when only one side is filled", () => {
    searchParams = new URLSearchParams(
      "metadataKey=evrak-ustverisi.evrak_no&metadataValue=E-1",
    );

    render(<SearchMetadataFilter schemas={[schema()]} />);

    fireEvent.change(screen.getByLabelText("Değer"), {
      target: { value: "" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Uygula" }));

    const target = new URL(push.mock.calls[0][0] as string, "http://localhost");

    expect(target.searchParams.has("metadataKey")).toBe(false);
    expect(target.searchParams.has("metadataValue")).toBe(false);
  });
});
