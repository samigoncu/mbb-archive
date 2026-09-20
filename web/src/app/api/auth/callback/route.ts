import { NextResponse, type NextRequest } from "next/server";
import { recordDirectorySignIn } from "@/features/organization/api/directory-sign-in";
import { exchangeCode, readOidcConfig } from "@/lib/auth/oidc";
import { safeReturnTo } from "@/lib/auth/return-to";
import { takeAuthState, writeSession } from "@/lib/auth/session";

/**
 * Kimlik sağlayıcı dönüşü. Durum çerezi tek kullanımlıktır ve okunurken
 * silinir; eşleşmeyen state ile gelen istek reddedilir (CSRF).
 */
export async function GET(request: NextRequest) {
  const config = readOidcConfig();

  if (!config) {
    return NextResponse.redirect(
      new URL("/login?durum=yapilandirilmadi", request.url),
    );
  }

  const params = request.nextUrl.searchParams;
  const error = params.get("error");

  if (error) {
    // Sağlayıcı hata metni kullanıcıya yansıtılmaz; günlüğe düşer.
    console.error("OIDC yetkilendirme hatası", error, params.get("error_description"));
    return NextResponse.redirect(new URL("/login?durum=reddedildi", request.url));
  }

  const code = params.get("code");
  const state = params.get("state");
  const expected = await takeAuthState();

  if (!code || !state || !expected || expected.state !== state) {
    return NextResponse.redirect(new URL("/login?durum=gecersiz", request.url));
  }

  try {
    const tokens = await exchangeCode(config, code, expected.verifier);

    await writeSession({ ...tokens, subject: readSubject(tokens.idToken) });

    // Künye oturum açar açmaz yazılır ki kullanıcı listelerde ve denetim
    // kayıtlarında ham dizin kimliği yerine adıyla görünsün.
    await recordDirectorySignIn(tokens.accessToken);

    // Durum çerezi şifreli ve dönüş adresi yazılırken de süzülüyor;
    // yine de yönlendirmeden hemen önce bir kez daha doğrulanır.
    return NextResponse.redirect(
      new URL(safeReturnTo(expected.returnTo), request.url),
    );
  } catch (exception) {
    console.error("OIDC jeton değişimi başarısız", exception);
    return NextResponse.redirect(new URL("/login?durum=basarisiz", request.url));
  }
}

/**
 * Kimlik jetonundan görüntülenecek kullanıcı adını okur. İmza burada
 * doğrulanmaz — jeton doğrudan jeton ucundan TLS üzerinden alındı ve bu değer
 * yalnızca arayüzde gösterilir; yetki kararı her istekte API'de verilir (§21).
 */
function readSubject(idToken?: string): string | undefined {
  if (!idToken) {
    return undefined;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"),
    ) as { preferred_username?: string; name?: string; sub?: string };

    return payload.preferred_username ?? payload.name ?? payload.sub;
  } catch {
    return undefined;
  }
}
