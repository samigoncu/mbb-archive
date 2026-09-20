import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MetadataSchemasWorkspace } from "./metadata-schemas-workspace";
import type {
  MetadataSchemaListItem,
  MetadataSchemaDetail,
} from "../model/classification";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

const mockSchemas: MetadataSchemaListItem[] = [
  {
    id: "schema-draft-1",
    key: "ruhsat",
    name: "Ruhsat Taslağı",
    version: 1,
    status: "Draft",
    createdAt: "2026-09-01T10:00:00Z",
    publishedAt: null,
    fieldCount: 2,
  },
  {
    id: "schema-pub-1",
    key: "sozlesme",
    name: "Sözleşme Üstverisi",
    version: 1,
    status: "Published",
    createdAt: "2026-08-01T10:00:00Z",
    publishedAt: "2026-08-02T10:00:00Z",
    fieldCount: 5,
  },
];

const mockDraftDetail: MetadataSchemaDetail = {
  id: "schema-draft-1",
  key: "ruhsat",
  name: "Ruhsat Taslağı",
  version: 1,
  status: "Draft",
  fields: [
    {
      id: "f1",
      key: "ruhsat_no",
      label: "Ruhsat No",
      fieldType: "Text",
      isRequired: true,
      isSearchable: true,
      isRepeatable: false,
      optionsJson: null,
    },
  ],
};

const mockPublishedDetail: MetadataSchemaDetail = {
  id: "schema-pub-1",
  key: "sozlesme",
  name: "Sözleşme Üstverisi",
  version: 1,
  status: "Published",
  fields: [],
};

it("filters schemas by search query", () => {
  render(
    <MetadataSchemasWorkspace
      schemasResult={{ items: mockSchemas, totalCount: 2, page: 1, pageSize: 50 }}
      selectedSchema={null}
      currentPage={1}
      pageSize={50}
    />
  );

  expect(screen.getByText("Ruhsat Taslağı")).toBeTruthy();
  expect(screen.getByText("Sözleşme Üstverisi")).toBeTruthy();

  const searchInput = screen.getByPlaceholderText(/Şema adı veya anahtarı ara/i);
  fireEvent.change(searchInput, { target: { value: "ruhsat" } });

  expect(screen.getByText("Ruhsat Taslağı")).toBeTruthy();
  expect(screen.queryByText("Sözleşme Üstverisi")).toBeNull();
});

it("filters schemas by status tab", () => {
  render(
    <MetadataSchemasWorkspace
      schemasResult={{ items: mockSchemas, totalCount: 2, page: 1, pageSize: 50 }}
      selectedSchema={null}
      currentPage={1}
      pageSize={50}
    />
  );

  // Click on "Taslak" filter tab
  const draftTab = screen.getByRole("button", { name: /Taslak \(1\)/i });
  fireEvent.click(draftTab);

  expect(screen.getByText("Ruhsat Taslağı")).toBeTruthy();
  expect(screen.queryByText("Sözleşme Üstverisi")).toBeNull();

  // Click on "Yayımlandı" filter tab
  const publishedTab = screen.getByRole("button", { name: /Yayımlandı \(1\)/i });
  fireEvent.click(publishedTab);

  expect(screen.queryByText("Ruhsat Taslağı")).toBeNull();
  expect(screen.getByText("Sözleşme Üstverisi")).toBeTruthy();
});

it("shows delete button and publish option for draft schemas", () => {
  render(
    <MetadataSchemasWorkspace
      schemasResult={{ items: mockSchemas, totalCount: 2, page: 1, pageSize: 50 }}
      selectedSchema={mockDraftDetail}
      currentPage={1}
      pageSize={50}
    />
  );

  expect(screen.getByRole("button", { name: /Taslağı Sil/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Şemayı Yayımla/i })).toBeTruthy();
  expect(screen.getByText("Ruhsat No")).toBeTruthy();
});

it("shows revert-to-draft button and field addition for published schemas", () => {
  render(
    <MetadataSchemasWorkspace
      schemasResult={{ items: mockSchemas, totalCount: 2, page: 1, pageSize: 50 }}
      selectedSchema={mockPublishedDetail}
      currentPage={1}
      pageSize={50}
    />
  );

  expect(screen.getByRole("button", { name: /Taslağa Geri Al/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: /taslağı oluştur/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Alan Ekle/i })).toBeTruthy();
});

