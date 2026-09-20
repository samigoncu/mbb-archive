"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { saveUploadPolicy, type UploadPolicy } from "../api/upload-policy";
export function UploadPolicyPanel({ initial, canManage }: { initial: UploadPolicy | null; canManage: boolean }) {
  const [policy, setPolicy] = useState(initial);
  const [size, setSize] = useState(String(initial?.maxFileSizeMb ?? ""));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (!policy) return <p role="alert">Yükleme ayarı alınamadı. Sayfayı yenileyin.</p>;
  return <form className="flex flex-col gap-4" onSubmit={async event => {
    event.preventDefault(); if (pending || !canManage) return;
    const value = Number(size);
    if (!Number.isInteger(value) || value < 1 || value > policy.maximumAllowedMb) { setError(`1–${policy.maximumAllowedMb} MB arasında bir tam sayı girin.`); return; }
    setPending(true); setError(""); setMessage("");
    try {
      const result = await saveUploadPolicy(value, policy.version);
      if (result.error || !result.data) { setError(result.error ?? "Ayar kaydedilemedi."); return; }
      setPolicy(result.data); setSize(String(result.data.maxFileSizeMb));
      setMessage("Yükleme sınırı kaydedildi. Yeni yüklemelerde hemen uygulanır.");
    } catch { setError("Sunucuya ulaşılamadı. Ayarın son durumunu kontrol etmek için sayfayı yenileyin."); }
    finally { setPending(false); }
  }}>
    <label className="text-sm font-medium" htmlFor="max-upload-mb">Dosya başına en büyük boyut (MB)</label>
    <div className="relative max-w-xs"><input aria-describedby="upload-limit-help" id="max-upload-mb" type="number" min={1} max={policy.maximumAllowedMb} step={1} required value={size} onChange={e => setSize(e.target.value)} disabled={pending || !canManage} className="h-12 w-full rounded-lg border border-input bg-background px-3 pr-14 text-lg font-semibold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground" aria-hidden>MB</span></div>
    <p id="upload-limit-help" className="text-sm leading-6 text-muted-foreground">İzin verilen aralık: 1–{policy.maximumAllowedMb} MB. Tarama ve yeni sürüm yüklemelerinde aynı sınır kullanılır. Dosyalar sırayla aktarılır.</p>
    <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">Büyük PDF’ler güvenlik taramasından sonra sayfa sayfa OCR işlemine alınır. İşlem süresi sayfa sayısına, görüntü çözünürlüğüne ve sunucu kapasitesine bağlıdır. Bu ayar virüs tarayıcısının sınırlarını değiştirmez.</p>
    {policy.updatedAt && <p className="text-xs text-muted-foreground">Son değişiklik: {policy.updatedBy} · {new Date(policy.updatedAt).toLocaleString("tr-TR")}</p>}
    {canManage ? <Button type="submit" className="self-start" disabled={pending}>{pending ? "Kaydediliyor…" : "Yükleme sınırını kaydet"}</Button> : <p className="text-sm">Bu ayarı yalnız sistem yöneticisi değiştirebilir.</p>}
    {message && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</p>}{error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
  </form>;
}
