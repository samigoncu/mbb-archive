import { getServerApiBaseUrl } from "@/lib/api/api-client";

/**
 * Yüklenen marka görselini API'den geçirir.
 *
 * Kimlik istemez: logo ve giriş ekranı görseli oturum açılmadan da gerekiyor.
 * Adres sürüm parametresi taşıdığı için uzun süre önbelleklenebilir.
 */
export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!["logo", "favicon", "login"].includes(kind)) {
    return new Response(null, { status: 404 });
  }

  const upstream = await fetch(
    `${getServerApiBaseUrl()}/operations/branding/assets/${encodeURIComponent(kind)}`,
    { cache: "no-store", signal: request.signal },
  );
  if (!upstream.ok) return new Response(null, { status: upstream.status });

  const headers = new Headers({
    "Cache-Control": new URL(request.url).searchParams.has("v")
      ? "public, max-age=31536000, immutable"
      : "public, max-age=60",
  });
  for (const key of ["content-type", "content-length", "etag", "last-modified"]) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }

  return new Response(upstream.body, { status: 200, headers });
}
