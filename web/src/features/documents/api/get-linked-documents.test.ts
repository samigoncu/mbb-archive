import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/api-client";
import { getDocumentById } from "./get-document-by-id";
import { getLinkedDocuments } from "./get-linked-documents";

vi.mock("./get-document-by-id", () => ({ getDocumentById: vi.fn() }));

describe("Linked document resolution", () => {
  it("preserves membership order and resolves actual document titles", async () => {
    vi.mocked(getDocumentById).mockImplementation(async (id) => ({
      id, title: `Başlık ${id}`, status: "Active", createdAt: "2026-09-05", archivedAt: null, versionCount: 1,
    }));
    const documents = await getLinkedDocuments(["b", "a"]);
    expect(documents.map((document) => document.details?.title)).toEqual(["Başlık b", "Başlık a"]);
  });

  it.each([403, 404])("keeps an unavailable entry without inventing a title for %s", async (status) => {
    vi.mocked(getDocumentById).mockRejectedValue(new ApiError("Unavailable", status));
    expect(await getLinkedDocuments(["hidden"])).toEqual([{ id: "hidden", details: null }]);
  });

  it("does not disguise an API outage as a missing document", async () => {
    const failure = new ApiError("Unavailable", 503);
    vi.mocked(getDocumentById).mockRejectedValue(failure);
    await expect(getLinkedDocuments(["doc"])).rejects.toBe(failure);
  });
});
