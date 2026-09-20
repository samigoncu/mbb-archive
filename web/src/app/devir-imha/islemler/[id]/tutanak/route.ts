import { authorizationHeader, getServerApiBaseUrl } from "@/lib/api/api-client";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Jeton oturum çerezinden alınır: tarayıcı bu isteğe Authorization
  // başlığı koymaz, gelen başlığı iletmek her zaman kimliksiz istek üretirdi.
  const headers = new Headers(await authorizationHeader());
  const response = await fetch(`${getServerApiBaseUrl()}/retention/dispositions/${encodeURIComponent(id)}/receipt`, { headers, cache: "no-store" });
  if (!response.ok) return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/problem+json" } });
  return new Response(response.body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="arsiv-tutanagi-${id}.json"`, "Cache-Control": "no-store" } });
}
