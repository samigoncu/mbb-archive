// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { POST } from "./route";
vi.mock("@/lib/api/api-client", () => ({
  authorizationHeader: async () => ({ Authorization: "Bearer server-session" }),
  getServerApiBaseUrl: () => "http://api/api/v1",
}));
afterEach(() => vi.unstubAllGlobals());

it("streams file bytes with their content length and encoded version reason using server credentials", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"ingestionId":"ing"}', { status: 202 }));
  vi.stubGlobal("fetch", fetch);
  const request = new Request("http://web/api/documents/doc/files", {
    method: "POST", body: "test",
    headers: { "Content-Type": "application/pdf", "Content-Length": "4", "X-File-Name": "signed.pdf", "X-Version-Reason": encodeURIComponent("İmzalı nüsha"), Authorization: "Bearer untrusted-client" },
  });
  const response = await POST(request, { params: Promise.resolve({ id: "doc" }) });
  expect(response.status).toBe(202);
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe("http://api/api/v1/documents/doc/files");
  expect(options.body).toBe(request.body);
  expect(options.headers.get("content-length")).toBe("4");
  expect(options.headers.get("x-version-reason")).toBe(encodeURIComponent("İmzalı nüsha"));
  expect(options.headers.get("authorization")).toBe("Bearer server-session");
});

it("preserves API rejection status and details", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"detail":"Belge arşivlenmiş."}', { status: 409 })));
  const response = await POST(new Request("http://web", { method: "POST", body: "x" }), { params: Promise.resolve({ id: "doc" }) });
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ detail: "Belge arşivlenmiş." });
});
