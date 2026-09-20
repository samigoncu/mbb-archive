import "server-only";

/**
 * Kurum kimlik sağlayıcısı ayarları. Adres ve istemci sırrı yalnızca
 * environment'tan gelir; varsayılanlar boştur ve boşken kimlik doğrulama
 * devre dışı kalır — geliştirme ortamı bugünkü gibi çalışmaya devam eder.
 */
export type OidcConfig = {
  issuer: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
};

export function readOidcConfig(): OidcConfig | null {
  const issuer = process.env.OIDC_ISSUER?.trim();
  const clientId = process.env.OIDC_CLIENT_ID?.trim();

  if (!issuer || !clientId) {
    return null;
  }

  const baseUrl = (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  return {
    issuer: issuer.replace(/\/$/, ""),
    clientId,
    clientSecret: process.env.OIDC_CLIENT_SECRET ?? "",
    scope: process.env.OIDC_SCOPE ?? "openid profile email groups offline_access",
    redirectUri: `${baseUrl}/api/auth/callback`,
    postLogoutRedirectUri: baseUrl,
  };
}

export function isAuthConfigured(): boolean {
  return readOidcConfig() !== null;
}

type Discovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
};

let cachedDiscovery: { issuer: string; document: Discovery } | null = null;

/**
 * OIDC keşif belgesi. Uç adresleri kodda sabitlenmez; sağlayıcı Keycloak,
 * ADFS veya başka bir ürün olabilir ve yolları farklıdır.
 */
export async function discover(config: OidcConfig): Promise<Discovery> {
  if (cachedDiscovery?.issuer === config.issuer) {
    return cachedDiscovery.document;
  }

  const response = await fetch(
    `${config.issuer}/.well-known/openid-configuration`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(
      `Kimlik sağlayıcı keşif belgesi okunamadı (${response.status}).`,
    );
  }

  const document = (await response.json()) as Discovery;
  cachedDiscovery = { issuer: config.issuer, document };

  return document;
}

export type TokenSet = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
};

/**
 * Yetkilendirme kodunu jetonla değişir. PKCE doğrulayıcısı zorunludur:
 * gizli tutulamayan bir istemcide kod yakalama saldırısını bu engeller.
 */
export async function exchangeCode(
  config: OidcConfig,
  code: string,
  codeVerifier: string,
): Promise<TokenSet> {
  const { token_endpoint } = await discover(config);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: codeVerifier,
  });

  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }

  return requestToken(token_endpoint, body);
}

/** Süresi dolan erişim jetonunu yeniler; kullanıcı yeniden giriş yapmaz. */
export async function refresh(
  config: OidcConfig,
  refreshToken: string,
): Promise<TokenSet> {
  const { token_endpoint } = await discover(config);

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
  });

  if (config.clientSecret) {
    body.set("client_secret", config.clientSecret);
  }

  return requestToken(token_endpoint, body);
}

async function requestToken(
  endpoint: string,
  body: URLSearchParams,
): Promise<TokenSet> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Jeton alınamadı (${response.status}): ${detail.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
  };

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    idToken: payload.id_token,
    // Saat kayması ve ağ gecikmesi için 30 saniye pay bırakılır.
    expiresAt: Date.now() + ((payload.expires_in ?? 300) - 30) * 1000,
  };
}

export async function endSessionUrl(
  config: OidcConfig,
  idToken?: string,
): Promise<string | null> {
  const { end_session_endpoint } = await discover(config);

  if (!end_session_endpoint) {
    return null;
  }

  const params = new URLSearchParams({
    post_logout_redirect_uri: config.postLogoutRedirectUri,
    client_id: config.clientId,
  });

  if (idToken) {
    params.set("id_token_hint", idToken);
  }

  return `${end_session_endpoint}?${params}`;
}

/** RFC 7636 S256 doğrulayıcı/mücadele çifti. */
export async function createPkcePair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64Url(bytes);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );

  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

export function randomToken(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(24)));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
