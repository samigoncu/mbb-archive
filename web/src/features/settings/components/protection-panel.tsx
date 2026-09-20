"use client";
import { useState, useTransition } from "react";
import { synchronizeProtection } from "../api/protection-actions";

export type ProtectionCapabilities = { provider: string; objectLockConfigured: boolean; automaticSynchronizationEnabled: boolean; digitalDeletionEnabled: boolean };
export function ProtectionPanel({ capabilities }: { capabilities: ProtectionCapabilities | null }) {
  const [pending, start] = useTransition(); const [accepted, setAccepted] = useState(false);
  const [result, setResult] = useState<{error: boolean; message: string} | null>(null);
  const supported = capabilities?.provider === "S3" && capabilities.objectLockConfigured;
  return <div className="space-y-4 text-sm">
    <p>Fiziksel imha, dijital asılları ve sürümlerini silmez. Dijital silme bu uygulamada kapalıdır.</p>
    {!capabilities ? <p role="alert">Depo koruma ayarları alınamadı.</p> : <dl className="grid gap-3 sm:grid-cols-2">
      <div><dt className="text-muted-foreground">Dosya deposu</dt><dd>{capabilities.provider === "S3" ? "S3 nesne deposu" : "Yerel dosya deposu"}</dd></div>
      <div><dt className="text-muted-foreground">Otomatik koruma eşitlemesi</dt><dd>{capabilities.automaticSynchronizationEnabled ? "Etkin" : "Kapalı"}</dd></div>
    </dl>}
    {!supported && <p className="rounded-lg bg-muted p-3">Değiştirilemez depo koruması için S3 Object Lock kurulmalıdır. Yerel dosya saklama tek başına WORM garantisi vermez.</p>}
    {supported && <><p>Saklama süreleri ve hukuki blokeler nesne kilitlerine uygulanır. Uzatılmış saklama süresi kısaltılmaz; başka kaynakların koyduğu blokeler kaldırılmaz.</p>
      <label className="flex items-start gap-2"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} className="mt-1" />Onaylı saklama kurallarını ve blokeleri dijital depoyla eşitlemek istiyorum.</label>
      <button type="button" disabled={pending || !accepted} onClick={() => start(async () => setResult(await synchronizeProtection()))} className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50">{pending ? "Koruma doğrulanıyor…" : "Dijital korumayı eşitle"}</button></>}
    {result && <p role={result.error ? "alert" : "status"} className={result.error ? "text-destructive" : "text-foreground"}>{result.message}</p>}
  </div>;
}
