import "server-only";

import { cookies } from "next/headers";
import { readOidcConfig, refresh, type TokenSet } from "@/lib/auth/oidc";

const SESSION_COOKIE = "mbb_session";
const STATE_COOKIE = "mbb_auth_state";

export type Session = TokenSet & { subject?: string };

type StateCookie = { state: string; verifier: string; returnTo: string };

/**
 * Oturum çerezi. Jetonlar taşıyıcı kimlik bilgisidir; httpOnly yetmez, çerez
 * içeriği ayrıca AES-GCM ile şifrelenir. Anahtar <c>AUTH_SECRET</c>'ten
 * türetilir ve yapılandırılmadan kimlik doğrulama açılamaz.
 */
async function key(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET en az 32 karakter olmalıdır; oturum çerezi bu anahtarla şifrelenir.",
    );
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );

  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function seal(value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(),
    new TextEncoder().encode(JSON.stringify(value)),
  );

  const packed = new Uint8Array(iv.length + ciphertext.byteLength);
  packed.set(iv);
  packed.set(new Uint8Array(ciphertext), iv.length);

  return Buffer.from(packed).toString("base64url");
}

async function unseal<T>(packed: string): Promise<T | null> {
  try {
    const bytes = Buffer.from(packed, "base64url");

    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes.subarray(0, 12) },
      await key(),
      bytes.subarray(12),
    );

    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    // Bozuk veya anahtarı değişmiş çerez oturum açmış saymaz.
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function writeSession(session: Session): Promise<void> {
  const store = await cookies();

  store.set(SESSION_COOKIE, await seal(session), {
    ...cookieOptions,
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(STATE_COOKIE);
}

export async function readSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;

  return raw ? unseal<Session>(raw) : null;
}

/**
 * Geçerli erişim jetonu. Süresi dolmuşsa yenileme jetonuyla tazelenir;
 * yenilenemezse oturum düşer ve çağıran kullanıcıyı girişe yollar.
 */
export async function getAccessToken(): Promise<string | null> {
  const config = readOidcConfig();

  if (!config) {
    // Kimlik sağlayıcı yapılandırılmadıysa jeton yok; API geliştirme
    // kimliğiyle çalışır ve istek başlıksız gider.
    return null;
  }

  const session = await readSession();

  if (!session) {
    return null;
  }

  if (session.expiresAt > Date.now()) {
    return session.accessToken;
  }

  if (!session.refreshToken) {
    await clearSession();
    return null;
  }

  try {
    const renewed = await refresh(config, session.refreshToken);

    await writeSession({
      ...renewed,
      // Sağlayıcı yeni bir yenileme jetonu vermezse eskisi korunur.
      refreshToken: renewed.refreshToken ?? session.refreshToken,
      subject: session.subject,
    });

    return renewed.accessToken;
  } catch {
    await clearSession();
    return null;
  }
}

export async function writeAuthState(state: StateCookie): Promise<void> {
  const store = await cookies();

  store.set(STATE_COOKIE, await seal(state), {
    ...cookieOptions,
    maxAge: 600,
  });
}

/**
 * Tek kullanımlık durum çerezini okur ve siler. Aynı state ikinci kez
 * kullanılamaz; tekrar oynatma saldırısı bu şekilde engellenir.
 */
export async function takeAuthState(): Promise<StateCookie | null> {
  const store = await cookies();
  const raw = store.get(STATE_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  store.delete(STATE_COOKIE);
  return unseal<StateCookie>(raw);
}

export const sessionCookieName = SESSION_COOKIE;
