import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "mbb_session";

/**
 * Oturum çerezi olmayan isteği giriş sayfasına yollar.
 *
 * <para>
 * Bu <em>iyimser</em> bir kontroldür: yalnızca çerezin varlığına bakar, içeriğini
 * doğrulamaz. Gerçek yetki kararı API'de her istekte yeniden verilir (§21);
 * buradaki amaç kullanıcıyı boş ekranlarla karşılaştırmamaktır.
 * </para>
 *
 * <para>
 * Kimlik sağlayıcı yapılandırılmamışsa hiçbir şey yapmaz; geliştirme ortamı
 * bugünkü gibi çalışır.
 * </para>
 */
export function proxy(request: NextRequest) {
  const configured =
    Boolean(process.env.OIDC_ISSUER?.trim()) &&
    Boolean(process.env.OIDC_CLIENT_ID?.trim());

  if (!configured || request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set(
    "returnTo",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(login);
}

export const config = {
  // Giriş akışının kendisi, statik varlıklar ve sağlık ucu dışarıda kalır;
  // aksi hâlde yönlendirme döngüsü oluşur.
  matcher: [
    "/((?!api/documents/[^/]+/files$|api/auth|login|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
