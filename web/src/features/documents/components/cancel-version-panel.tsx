"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelVersionAction } from "../api/cancel-version-action";
import type { DocumentVersionSummary } from "../api/get-document-versions";

export function CancelVersionPanel({ documentId, version, versions, currentVersion, expectedVersion, canCancel, archived }: {
  documentId: string; version: DocumentVersionSummary | undefined; versions: DocumentVersionSummary[];
  currentVersion: number; expectedVersion: number | undefined; canCancel: boolean; archived: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [replacement, setReplacement] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const requestId = useRef<string | null>(null);
  if (!version) return <p className="text-sm text-muted-foreground">Depolanmış sürüm yok. Yanlış oluşturulan kayıt için “Yanlış yüklemeyi iptal et” işlemini kullanabilirsiniz.</p>;
  if (version.cancelledAt) return <section className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-3 text-sm" role="status">
    <p className="font-semibold">v{version.versionNumber} — İptal edildi</p>
    <p className="mt-1">{version.cancellationReason}</p>
    <p className="mt-1 text-xs text-muted-foreground">{version.cancelledBy} · {new Date(version.cancelledAt).toLocaleString("tr-TR")}</p>
    <p className="mt-1 text-xs">Bu sürüm geçerli değildir. Dosya ve işlem geçmişi korunur.</p>
  </section>;
  const unavailable = archived ? "Arşivlenmiş belgenin sürümü iptal edilemez." : !canCancel ? "Sürüm iptal yetkiniz yok." : !expectedVersion ? "İşlem bilgileri alınamadı. Sayfayı yenileyin." : null;
  if (unavailable) return <section className="text-sm"><button type="button" disabled className="rounded border px-3 py-2 font-semibold opacity-50">v{version.versionNumber} sürümünü iptal et</button><p className="mt-2 text-xs text-muted-foreground">{unavailable}</p></section>;
  const isCurrent = version.versionNumber === currentVersion;
  const alternatives = versions.filter(v => !v.cancelledAt && v.versionNumber !== version.versionNumber);
  const canSubmit = !!reason.trim() && (!isCurrent || alternatives.some(v => String(v.versionNumber) === replacement));
  return <section className="text-sm">
    <button type="button" className="rounded border border-destructive px-3 py-2 font-semibold text-destructive" disabled={pending} aria-expanded={open} onClick={() => setOpen(!open)}>v{version.versionNumber} sürümünü iptal et</button>
    {open && <form className="mt-3 space-y-3" onSubmit={event => {
      event.preventDefault(); if (pending || !canSubmit) return;
      setError(""); setMessage("");
      requestId.current ??= crypto.randomUUID();
      startTransition(async () => {
        const result = await cancelVersionAction(documentId, version.versionNumber, {
          expectedVersion: expectedVersion!, requestId: requestId.current!, reason: reason.trim(), replacementVersionNumber: isCurrent ? Number(replacement) : null,
        });
        if (result.error) { setError(result.error); return; }
        setMessage(`v${version.versionNumber} iptal edildi. Dosyası ve geçmişi korundu.`);
        setOpen(false); router.refresh();
      });
    }}>
      <p>Bu sürüm geçersiz olarak işaretlenecek. Dosya, sürüm numarası ve işlem geçmişi korunacak.</p>
      {isCurrent && !alternatives.length ? <p role="alert">Bu tek geçerli sürüm. Belgenin tamamı yanlış yüklendiyse “Yanlış yüklemeyi iptal et” işlemini kullanın; yalnız içeriği düzeltmek için önce yeni sürüm yükleyin.</p> : <fieldset disabled={pending} className="space-y-3">
        {isCurrent && <label className="block">Yerine geçecek güncel sürüm
          <select required value={replacement} onChange={event => { setReplacement(event.target.value); requestId.current = null; }} className="mt-1 block w-full rounded border border-border bg-background p-2">
            <option value="">Geçerli bir sürüm seçin</option>
            {alternatives.map(v => <option key={v.versionNumber} value={v.versionNumber}>v{v.versionNumber} · {v.createdAt.slice(0, 10)}{v.reason ? ` · ${v.reason}` : ""}</option>)}
          </select>
        </label>}
        <label className="block">İptal gerekçesi<textarea required maxLength={1000} value={reason} onChange={event => { setReason(event.target.value); requestId.current = null; }} className="mt-1 block w-full rounded border border-border bg-background p-2" /></label>
        {isCurrent && replacement && <p>v{version.versionNumber} iptal edilecek; v{replacement} güncel sürüm olacak.</p>}
        <button type="submit" disabled={!canSubmit || pending} className="rounded bg-destructive px-3 py-2 font-semibold text-white disabled:opacity-50">{pending ? "İptal ediliyor…" : "Gerekçeyle iptal et"}</button>
      </fieldset>}
    </form>}
    {error && <p role="alert" className="mt-2 text-destructive">{error}</p>}
    {message && <p role="status" className="mt-2">{message}</p>}
  </section>;
}
