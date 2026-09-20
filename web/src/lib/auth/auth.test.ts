import { describe, expect, it } from "vitest";
import { safeReturnTo } from "@/lib/auth/return-to";
import { createPkcePair, randomToken } from "@/lib/auth/oidc";

describe("safeReturnTo", () => {
  it("uygulama içi yolu korur", () => {
    expect(safeReturnTo("/documents/42?sekme=izler")).toBe(
      "/documents/42?sekme=izler",
    );
  });

  it("boş değeri kök adrese düşürür", () => {
    expect(safeReturnTo(null)).toBe("/");
    expect(safeReturnTo("")).toBe("/");
  });

  it("mutlak adresi reddeder", () => {
    expect(safeReturnTo("https://kotu.site/oltalama")).toBe("/");
  });

  /** Protokole göreli adres tarayıcıda dış siteye çözülür. */
  it("protokole göreli adresi reddeder", () => {
    expect(safeReturnTo("//kotu.site/oltalama")).toBe("/");
    expect(safeReturnTo("/\\kotu.site/oltalama")).toBe("/");
  });

  it("javascript şemasını reddeder", () => {
    expect(safeReturnTo("javascript:alert(1)")).toBe("/");
  });
});

describe("PKCE", () => {
  it("her çağrıda farklı doğrulayıcı üretir", async () => {
    const first = await createPkcePair();
    const second = await createPkcePair();

    expect(first.verifier).not.toBe(second.verifier);
    expect(first.challenge).not.toBe(second.challenge);
  });

  /** RFC 7636: doğrulayıcı 43-128 karakter, yalnızca URL-güvenli alfabe. */
  it("doğrulayıcı ve mücadele URL-güvenli biçimdedir", async () => {
    const { verifier, challenge } = await createPkcePair();

    expect(verifier).toMatch(/^[A-Za-z0-9\-_]{43,128}$/);
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]{43}$/);
  });

  it("mücadele doğrulayıcının SHA-256 özetidir", async () => {
    const { verifier, challenge } = await createPkcePair();

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(verifier),
    );

    const expected = Buffer.from(digest).toString("base64url");

    expect(challenge).toBe(expected);
  });
});

describe("randomToken", () => {
  it("tahmin edilemez ve tekrarsızdır", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => randomToken()));

    expect(tokens.size).toBe(100);
  });
});
