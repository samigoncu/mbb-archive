import { authorizationHeader, getServerApiBaseUrl } from "@/lib/api/api-client";

/**
 * Tarayıcıdan gelen dosya yüklemesini jetonla API'ye iletir. Gövde belleğe
 * alınmaz, akış olarak geçirilir: büyük tarama dosyaları sunucuyu şişirmemeli.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const headers = new Headers(await authorizationHeader());
  headers.set(
    "Content-Type",
    request.headers.get("content-type") ?? "application/octet-stream",
  );

  // Dosya adı ve sürüm gerekçesi başlıkta taşınır; istemcinin gönderdiği
  // diğer başlıklar bilinçli olarak iletilmez.
  for (const header of ["x-file-name", "x-version-reason", "content-length"]) {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  }

  const upstream = await fetch(
    `${getServerApiBaseUrl()}/documents/${encodeURIComponent(id)}/files`,
    {
      method: "POST",
      headers,
      body: request.body,
      // Akış gövdesi gönderirken zorunlu: istek ve yanıt aynı anda açık kalır.
      duplex: "half",
      cache: "no-store",
    } as RequestInit & { duplex: "half" },
  );

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
