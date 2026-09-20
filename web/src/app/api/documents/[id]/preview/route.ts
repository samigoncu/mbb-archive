import { authorizationHeader, getServerApiBaseUrl } from "@/lib/api/api-client";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const query = new URL(request.url).searchParams;
  const content = query.get("content") === "true";
  const download = query.get("download") === "true";
  const upstreamQuery = new URLSearchParams();
  if (download) upstreamQuery.set("download", "true");
  if (query.has("version")) upstreamQuery.set("version", query.get("version")!);
  const headers = new Headers(await authorizationHeader());
  if (content && request.headers.has("range")) headers.set("range", request.headers.get("range")!);
  const upstream = await fetch(`${getServerApiBaseUrl()}/processing/documents/${encodeURIComponent(id)}/preview${content ? "/content" : ""}?${upstreamQuery}`, { headers, cache: "no-store", signal: request.signal });
  const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
  for (const key of ["content-type", "content-length", "content-disposition", "content-range", "accept-ranges"]) {
    const value = upstream.headers.get(key);
    if (value) responseHeaders.set(key, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
