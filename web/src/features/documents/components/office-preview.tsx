"use client";
import { useEffect, useState } from "react";
import { Download, FileText, LoaderCircle } from "lucide-react";

type PreviewState = { status: "Pending" | "Ready" | "Failed" | "Unavailable" | "Error"; pageCount?: number; message?: string };
export function OfficePreview({ documentId, title, versionNumber, fill = false }: { documentId: string; title: string; versionNumber?: number; fill?: boolean }) {
  const [state, setState] = useState<PreviewState>({ status: "Pending" });
  const [attempt, setAttempt] = useState(0);
  const url = `/api/documents/${encodeURIComponent(documentId)}/preview${versionNumber === undefined ? "" : `?version=${versionNumber}`}`;
  const contentUrl = `${url}${versionNumber === undefined ? "?" : "&"}content=true`;
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    setState({ status: "Pending" });
    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("PDF kopyasının durumu alınamadı.");
        const result: PreviewState = await response.json();
        if (controller.signal.aborted) return;
        setState(result);
        if (result.status === "Pending" && ++polls < 60) timer = setTimeout(load, 3000);
      } catch {
        if (!controller.signal.aborted) setState({ status: "Error", message: "PDF kopyasının durumu alınamadı. Yeniden deneyebilirsiniz." });
      }
    }
    void load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [url, attempt]);
  if (state.status === "Ready") return <div className={`flex w-full flex-col gap-2 ${fill ? "h-full min-h-0" : ""}`}>
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 text-sm">
      <span>PDF görüntüleme kopyası{state.pageCount ? ` · ${state.pageCount} sayfa` : ""}</span>
      <a href={`${contentUrl}&download=true`} className="inline-flex items-center gap-1 rounded border bg-background px-3 py-2 font-medium"><Download className="size-4" aria-hidden />PDF kopyasını indir</a>
    </div>
    <iframe src={contentUrl} title={`${title} — PDF kopyası`} className={`${fill ? "min-h-0 flex-1" : "h-[640px]"} w-full rounded border bg-white`} />
  </div>;
  return <div className="flex w-full flex-col items-center gap-3 p-8 text-center" role={state.status === "Failed" || state.status === "Error" ? "alert" : "status"}>
    {state.status === "Pending" ? <LoaderCircle aria-hidden className="size-8 animate-spin text-primary" /> : <FileText aria-hidden className="size-8 text-muted-foreground" />}
    <p>{state.message ?? "PDF kopyası hazırlanıyor. İşlem bitince burada açılacak."}</p>
    <p className="text-sm text-muted-foreground">Orijinal Office dosyasını üstteki indirme düğmesinden alabilirsiniz.</p>
    <button type="button" onClick={() => setAttempt(value => value + 1)} className="text-sm text-primary underline">Durumu yenile</button>
  </div>;
}
