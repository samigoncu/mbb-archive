import { NextResponse, type NextRequest } from "next/server";
import { createPkcePair, discover, randomToken, readOidcConfig } from "@/lib/auth/oidc";
import { safeReturnTo } from "@/lib/auth/return-to";
import { writeAuthState } from "@/lib/auth/session";

/**
 * Yetkilendirme kodu akışını başlatır. Kimlik sağlayıcı yapılandırılmamışsa
 * (geliştirme ortamı) giriş sayfasına geri döner; hata sayfası göstermez.
 */
export async function GET(request: NextRequest) {
  const config = readOidcConfig();

  if (!config) {
    return NextResponse.redirect(
      new URL("/login?durum=yapilandirilmadi", request.url),
    );
  }

  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const state = randomToken();
  const { verifier, challenge } = await createPkcePair();

  await writeAuthState({ state, verifier, returnTo });

  const { authorization_endpoint } = await discover(config);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return NextResponse.redirect(`${authorization_endpoint}?${params}`);
}
