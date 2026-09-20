"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { changeDocumentCancellation } from "../api/document-cancellation-action";
import type { DocumentDetails } from "../api/get-document-by-id";

export function DocumentCancellationPanel({ details, canCancel }: { details: DocumentDetails; canCancel: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const requestId = useRef<string | null>(null);
  const cancelled = details.status === "Cancelled";
  const unavailable = details.status === "Archived" ? "Arşivlenmiş belge bu işlemle iptal edilemez."
    : !canCancel ? "Belge iptal ve geri alma yetkiniz yok."
    : !details.concurrencyVersion ? "İşlem bilgileri alınamadı. Sayfayı yenileyin." : null;
  return <section className="rounded-lg border border-border bg-card p-4 text-sm">
    <h3 className="font-semibold">Belgenin tamamı</h3>
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Belgeyi tüm sürümleriyle birlikte aktif kullanımdan kaldırın veya iptalini geri alın.</p>
    {cancelled && <div role="status" className="my-2 rounded border border-amber-500/50 bg-amber-500/5 p-2">
      <p className="font-semibold">Belge iptal edildi</p><p>{details.cancellationReason}</p>
      <p className="mt-1 text-xs">{details.cancelledBy} · {details.cancelledAt ? new Date(details.cancelledAt).toLocaleString("tr-TR") : ""}</p>
      <p className="mt-1 text-xs">Aktif listelerde ve aramada görünmez. Dosyası, sürümleri ve geçmiş bağlantıları korunur.</p>
    </div>}
    <button type="button" disabled={pending || !!unavailable} aria-expanded={open} onClick={() => setOpen(!open)} className="mt-2 rounded border border-destructive px-3 py-2 font-semibold text-destructive disabled:opacity-50">
      {cancelled ? "Belge iptalini geri al" : "Yanlış yüklemeyi iptal et"}
    </button>
    {unavailable && <p className="mt-2 text-xs text-muted-foreground">{unavailable}</p>}
    {open && !unavailable && <form className="mt-3 space-y-3" onSubmit={event => {
      event.preventDefault(); if (pending || !reason.trim()) return;
      requestId.current ??= crypto.randomUUID(); setError("");
      startTransition(async () => {
        const result = await changeDocumentCancellation(details.id, !cancelled, { expectedVersion: details.concurrencyVersion!, requestId: requestId.current!, reason: reason.trim() });
        if (result.error) { setError(result.error); return; }
        setOpen(false); setReason(""); requestId.current = null; router.refresh();
      });
    }}>
      <p>{cancelled ? "Belge önceki durumuna dönecek ve yetki kapsamındaki listelerde yeniden görünecek." : "Belgenin tüm sürümleri aktif kullanımdan kaldırılacak. Bu işlem dosyayı kalıcı silmez; gerekçeyle geri alınabilir."}</p>
      <label className="block">{cancelled ? "Geri alma gerekçesi" : "Belge iptal gerekçesi"}
        <textarea required maxLength={1000} disabled={pending} value={reason} onChange={event => { setReason(event.target.value); requestId.current = null; }} className="mt-1 block w-full rounded border bg-background p-2" />
      </label>
      <button type="submit" disabled={pending || !reason.trim()} className="rounded bg-destructive px-3 py-2 font-semibold text-white disabled:opacity-50">{pending ? "Kaydediliyor…" : cancelled ? "Gerekçeyle geri al" : "Belgeyi gerekçeyle iptal et"}</button>
    </form>}
    {error && <p role="alert" className="mt-2 text-destructive">{error}</p>}
    <Link href="/documents?status=Cancelled" className="mt-3 block text-xs text-primary underline">İptal edilen belgeler</Link>
  </section>;
}
