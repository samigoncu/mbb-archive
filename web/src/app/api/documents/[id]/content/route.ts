import { contentErrorResponse } from "@/features/documents/api/content-error-response";
import { authorizationHeader, getServerApiBaseUrl } from "@/lib/api/api-client";

/**
 * Belge içeriğinin tarayıcıya açılan yolu (önizleme çerçevesi ve indirme).
 *
 * <para>
 * Tarayıcı API'ye doğrudan gidemez: erişim jetonu httpOnly çerezdedir ve bir
 * <c>&lt;iframe src&gt;</c> ya da indirme bağlantısı başlık taşıyamaz. İstek
 * burada jetonla imzalanıp iletilir; izin kararı yine API'de verilir (§21/§28).
 * </para>
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const query = new URL(request.url).searchParams;
  const upstreamQuery = new URLSearchParams();
  if (query.get("download") === "true") upstreamQuery.set("download", "true");
  if (query.has("version")) upstreamQuery.set("version", query.get("version")!);

  const headers = new Headers(await authorizationHeader());
  const range = request.headers.get("range");

  // Aralık istekleri PDF görüntüleyicinin sayfa sayfa okumasını sağlar.
  if (range) {
    headers.set("range", range);
  }

  const upstream = await fetch(
    `${getServerApiBaseUrl()}/documents/${encodeURIComponent(id)}/content?${upstreamQuery}`,
    { headers, cache: "no-store" },
  );

  if (!upstream.ok && upstream.status !== 206) {
    return contentErrorResponse(upstream, request.headers.get("accept"));
  }

  const passthrough = new Headers({ "Cache-Control": "no-store" });

  for (const header of [
    "content-type",
    "content-length",
    "content-disposition",
    "content-range",
    "accept-ranges",
    "etag",
  ]) {
    const value = upstream.headers.get(header);
    if (value) passthrough.set(header, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: passthrough,
  });
}
