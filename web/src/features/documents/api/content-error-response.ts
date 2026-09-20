/** Render failed iframe previews without exposing raw ProblemDetails JSON. */
export async function contentErrorResponse(upstream: Response, accept: string | null): Promise<Response> {
  const body = await upstream.text();
  if (!accept?.includes("text/html")) {
    return new Response(body, { status: upstream.status, headers: {
      "Content-Type": "application/problem+json", "Cache-Control": "no-store",
    } });
  }
  let code: string | undefined;
  let trace: string | undefined;
  try {
    const problem = JSON.parse(body);
    code = typeof problem.code === "string" ? problem.code : undefined;
    trace = typeof problem.traceId === "string" ? problem.traceId : undefined;
  } catch { /* The upstream may return a non-JSON service error. */ }
  const message = code === "documents.original_missing_in_storage"
    ? "Belgenin kaydı mevcut ancak özgün dosyasına depolamada erişilemiyor. Depolama bağlantısı ve dosya bütünlüğü kontrol edilmelidir."
    : upstream.status === 403 ? "Bu belgeyi görüntüleme yetkiniz bulunmuyor."
    : upstream.status === 404 ? "Belge veya istenen sürüm bulunamadı."
    : "Belge içeriği şu anda alınamıyor. Yeniden deneyin.";
  const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  return new Response(`<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Belge görüntülenemiyor</title><style>body{font:16px system-ui,sans-serif;color:#253047;background:#f8fafc;margin:0;padding:32px}main{max-width:560px;margin:32px auto}h1{font-size:20px}p{line-height:1.6}small{display:block;overflow-wrap:anywhere;color:#64748b;margin-top:24px}a{color:#174ea6}</style><main><h1>Belge görüntülenemiyor</h1><p>${message}</p><a href="">Tekrar dene</a>${trace ? `<small>Destek için işlem kodu: ${escape(trace)}</small>` : ""}</main></html>`, {
    status: upstream.status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'self'" },
  });
}
