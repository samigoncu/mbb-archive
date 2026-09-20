import { authorizationHeader, getServerApiBaseUrl } from "@/lib/api/api-client";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const response = await fetch(`${getServerApiBaseUrl()}/retention/dispositions/${encodeURIComponent(id)}/package`, { headers: await authorizationHeader(), cache: "no-store" });
  return new Response(response.body, { status: response.status, headers: { "Content-Type": response.ok ? "application/zip" : "application/problem+json", "Content-Disposition": `attachment; filename="arsiv-devir-${id}.zip"`, "Cache-Control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) return Response.json({ detail: "İstek kaynağı doğrulanamadı." }, { status: 403 });
  const { id } = await params; const url = new URL(request.url);
  const packageId = url.searchParams.get("packageId") ?? ""; const expectedVersion = url.searchParams.get("expectedVersion") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(packageId) || !/^\d+$/.test(expectedVersion)) return Response.json({ detail: "Paket bilgisi geçersiz." }, { status: 400 });
  const response = await fetch(`${getServerApiBaseUrl()}/retention/dispositions/${encodeURIComponent(id)}/package/${packageId}/verify?expectedVersion=${expectedVersion}`, {
    method: "POST", headers: { ...Object.fromEntries(new Headers(await authorizationHeader()).entries()), "Content-Type": "application/zip" }, body: request.body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  return new Response(response.body, { status: response.status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" } });
}
