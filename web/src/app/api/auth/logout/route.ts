import { NextResponse, type NextRequest } from "next/server";
import { endSessionUrl, readOidcConfig } from "@/lib/auth/oidc";
import { clearSession, readSession } from "@/lib/auth/session";

/**
 * Çıkış yalnızca POST kabul eder: GET olsaydı bir &lt;img&gt; etiketi
 * kullanıcının oturumunu kapatabilirdi.
 */
export async function POST(request: NextRequest) {
  const config = readOidcConfig();
  const session = await readSession();

  // Yerel çerez her hâlükârda düşer; sağlayıcı ulaşılamasa bile bu ortamda
  // oturum kapanmış olur.
  await clearSession();

  if (!config) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const target = await endSessionUrl(config, session?.idToken).catch(() => null);

  return NextResponse.redirect(target ?? new URL("/login", request.url).toString(), 303);
}
