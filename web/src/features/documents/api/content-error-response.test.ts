import { describe, expect, it } from "vitest";
import { contentErrorResponse } from "./content-error-response";

describe("content error presentation", () => {
  const problem = { code: "documents.original_missing_in_storage", detail: "internal detail", traceId: '<script>alert(1)</script>' };
  it("keeps 409 and provides an escaped Turkish iframe error", async () => {
    const result = await contentErrorResponse(Response.json(problem, { status: 409 }), "text/html");
    expect(result.status).toBe(409);
    const html = await result.text();
    expect(html).toContain("özgün dosyasına depolamada erişilemiyor");
    expect(html).not.toContain("internal detail");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it("preserves the machine-readable API contract", async () => {
    const result = await contentErrorResponse(Response.json(problem, { status: 409 }), "application/json");
    expect(result.status).toBe(409);
    expect(await result.json()).toEqual(problem);
  });
});
