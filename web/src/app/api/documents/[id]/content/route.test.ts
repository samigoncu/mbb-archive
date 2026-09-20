// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";
import { GET as preview } from "../preview/route";
vi.mock("@/lib/api/api-client", () => ({ authorizationHeader: async () => ({ Authorization: "Bearer server" }), getServerApiBaseUrl: () => "http://api/api/v1" }));
afterEach(() => vi.unstubAllGlobals());
it("forwards historical version, download and range while retaining response headers", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response("old", { status: 206, headers: { "content-type": "image/png", "content-range": "bytes 0-2/3", "content-disposition": "attachment; filename=doc-v1.png" } }));
  vi.stubGlobal("fetch", fetch);
  const response = await GET(new Request("http://web/api/documents/doc/content?version=1&download=true", { headers: { range: "bytes=0-2" } }), { params: Promise.resolve({ id: "doc" }) });
  expect(fetch.mock.calls[0][0]).toBe("http://api/api/v1/documents/doc/content?download=true&version=1");
  expect(fetch.mock.calls[0][1].headers.get("range")).toBe("bytes=0-2");
  expect(fetch.mock.calls[0][1].headers.get("authorization")).toBe("Bearer server");
  expect(response.status).toBe(206);
  expect(response.headers.get("content-range")).toBe("bytes 0-2/3");
  expect(await response.text()).toBe("old");
});
it("preserves a missing version response instead of retrying the latest content", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"detail":"Sürüm yok"}', { status: 404 }));
  vi.stubGlobal("fetch", fetch);
  const response = await GET(new Request("http://web/content?version=999"), { params: Promise.resolve({ id: "doc" }) });
  expect(response.status).toBe(404);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("passes the historical version to both Office preview endpoints", async () => {
  const fetch = vi.fn().mockImplementation(async () => new Response("{}"));
  vi.stubGlobal("fetch", fetch);
  await preview(new Request("http://web/preview?version=1"), { params: Promise.resolve({ id: "doc" }) });
  await preview(new Request("http://web/preview?version=1&content=true&download=true"), { params: Promise.resolve({ id: "doc" }) });
  expect(fetch.mock.calls[0][0]).toBe("http://api/api/v1/processing/documents/doc/preview?version=1");
  expect(fetch.mock.calls[1][0]).toBe("http://api/api/v1/processing/documents/doc/preview/content?download=true&version=1");
});
