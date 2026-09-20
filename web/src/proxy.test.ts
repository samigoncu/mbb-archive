import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

afterEach(() => vi.unstubAllEnvs());
describe("login routing", () => {
  it("shows the login page and preserves the intended destination", () => {
    vi.stubEnv("OIDC_ISSUER", "https://identity.example.org");
    vi.stubEnv("OIDC_CLIENT_ID", "archive");
    const response = proxy(new NextRequest("https://archive.example.org/documents?status=Active"));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("returnTo")).toBe("/documents?status=Active");
  });
  it("preserves development access without an identity provider", () => {
    vi.stubEnv("OIDC_ISSUER", "");
    vi.stubEnv("OIDC_CLIENT_ID", "");
    expect(proxy(new NextRequest("https://archive.example.org/documents")).headers.get("location")).toBeNull();
  });
  it("allows existing session cookies through the optimistic check", () => {
    vi.stubEnv("OIDC_ISSUER", "https://identity.example.org");
    vi.stubEnv("OIDC_CLIENT_ID", "archive");
    const request = new NextRequest("https://archive.example.org/documents", { headers: { cookie: "mbb_session=existing" } });
    expect(proxy(request).headers.get("location")).toBeNull();
  });
});
