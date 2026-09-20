import { authorizationHeader, getServerApiBaseUrl } from "@/lib/api/api-client";

/**
 * WMS isteklerini API'ye geçirir.
 *
 * Leaflet kutucuk adresini kendisi kurar ve tarayıcıdan çağırır; jeton
 * httpOnly çerezde durduğu için istek bu uçtan geçerek yetkilendirilir.
 * Servis adresi ve kimlik bilgisi hiçbir zaman istemciye inmez.
 */
export async function GET(request: Request, { params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const query = new URL(request.url).searchParams;

  const upstream = await fetch(
    `${getServerApiBaseUrl()}/geo/wms/${encodeURIComponent(serviceId)}?${query}`,
    { headers: new Headers(await authorizationHeader()), cache: "no-store", signal: request.signal },
  );

  if (!upstream.ok) return new Response(null, { status: upstream.status });

  const headers = new Headers({ "Cache-Control": "private, max-age=60" });
  for (const key of ["content-type", "content-length"]) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }

  return new Response(upstream.body, { status: 200, headers });
}
