"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createRuleAction, createDispositionAction, advanceDispositionAction, changeHoldAction, configureCommissionAction, delegateCommissionAction, createTransferPackageAction, type ProcessActionState } from "../api/disposition-actions";
import type { Disposition, ProcessOperation } from "../model/disposition";

const localDateTime = (value: string) => { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

function withLocalDates(action: (previous: ProcessActionState, data: FormData) => Promise<ProcessActionState>, fields: string[]) {
  return (previous: ProcessActionState, data: FormData) => {
    for (const field of fields) { const value = data.get(field); if (typeof value === "string" && value) { const date = new Date(value); if (Number.isFinite(date.getTime())) data.set(field, date.toISOString()); } }
    return action(previous, data);
  };
}
const initial: ProcessActionState = { status: "idle" };
const fieldClass = "w-full rounded-md border border-border bg-background p-2 text-sm";
function Feedback({ state }: { state: ProcessActionState }) {
  return state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{state.message}</p> : null;
}

export function CreateProcessForm({ caseId, requestId, allowDestroy }: { caseId: string; requestId: string; allowDestroy: boolean }) {
  const [state, action, pending] = useActionState(createDispositionAction, initial);
  const router = useRouter();
  useEffect(() => { if (state.status === "success" && state.id) router.push(`/devir-imha/islemler/${state.id}`); }, [state, router]);
  return <form action={action} className="flex max-w-xl flex-col gap-4">
    <input type="hidden" name="requestId" value={requestId} /><input type="hidden" name="retentionCaseId" value={caseId} />
    <label className="space-y-1 text-sm">Önerilen karar<select name="action" className={fieldClass} required defaultValue="Transfer">
      <option value="Transfer">Arşive devir</option><option value="KeepPermanent">Kalıcı saklama</option>
      {allowDestroy && <option value="Destroy">Fiziksel imha değerlendirmesi (dijital korunur)</option>}
    </select></label>
    <label className="space-y-1 text-sm">Komisyon görevlendirme yazısı / referansı<input name="commissionReference" required maxLength={300} className={fieldClass} /></label>
    <label className="space-y-1 text-sm">Değerlendirme gerekçesi<textarea name="reason" required maxLength={2000} rows={4} className={fieldClass} /></label>
    <Feedback state={state} /><Button type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Taslak oluştur"}</Button>
  </form>;
}

export function ProcessStepForm({ process, operation, label }: { process: Disposition; operation: ProcessOperation; label: string }) {
  const [state, action, pending] = useActionState(withLocalDates(advanceDispositionAction, ["executedAt"]), initial);
  return <form action={action} className="flex max-w-xl flex-col gap-3">
    <input type="hidden" name="id" value={process.id} /><input type="hidden" name="version" value={process.version} />
    <input type="hidden" name="operation" value={operation} />
    {operation === "reviews" && <>
      <label className="space-y-1 text-sm">Komisyon görüşü<select name="decision" className={fieldClass} required defaultValue="">
        <option value="" disabled>Görüş seçin</option><option value="approve">Uygun</option><option value="reject">Uygun değil — reddet</option>
      </select></label>
      <label className="space-y-1 text-sm">Görüş gerekçesi<textarea name="reason" required maxLength={2000} rows={3} className={fieldClass} /></label>
    </>}
    {(operation === "approve" || operation === "accept-transfer" || operation === "execute-destruction") && <label className="space-y-1 text-sm">
      {operation === "approve" ? "Nihai onay yazısı referansı" : operation === "execute-destruction" ? "İmha protokolü / tutanak referans no" : "Teslim alma tutanağı referansı"}
      <input name="reference" required maxLength={300} className={fieldClass} placeholder={operation === "execute-destruction" ? "Örn: MBB-İMHA-2026-0042" : undefined} />
    </label>}
    {operation === "execute-destruction" && <>
      <p className="rounded-md border border-border bg-muted p-3 text-sm">Gerçekleşmiş fiziksel imhayı kanıt belgesiyle kaydedin. Dijital asıllar, tüm sürümler, üstveri ve işlem geçmişi kalıcı korunur.</p>
      <label className="space-y-1 text-sm">İmzalı / taranmış tutanak belgesinin kimliği<input name="evidenceDocumentId" required className={fieldClass} /><span className="block text-xs text-muted-foreground">Önce tutanağı belge olarak yükleyin; belge ayrıntılarındaki kimliği kullanın.</span></label>
      <label className="space-y-1 text-sm">Tutanak sürümünün kimliği<input name="evidenceVersionId" required className={fieldClass} /></label>
      <label className="space-y-1 text-sm">Fiziksel imha yöntemi<input name="method" required maxLength={300} className={fieldClass} /></label>
      <label className="space-y-1 text-sm">Gerçekleştiği yer<input name="location" required maxLength={300} className={fieldClass} /></label>
      <label className="space-y-1 text-sm">Gerçekleşme tarihi ve saati<input name="executedAt" required type="datetime-local" className={fieldClass} /></label>
      <label className="space-y-1 text-sm">Tanıklar ve görevleri<textarea name="witnesses" required maxLength={2000} className={fieldClass} /></label>
    </>}
    {operation === "accept-transfer" && <label className="space-y-1 text-sm">Teslim alan kurum / arşiv<input name="receivingArchive" required maxLength={300} className={fieldClass} /></label>}
    <Feedback state={state} /><Button type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : label}</Button>
  </form>;
}

export function HoldForm({ caseId, holdId }: { caseId: string; holdId?: string }) {
  const [state, action, pending] = useActionState(changeHoldAction, initial);
  return <form action={action} className="flex max-w-xl flex-col gap-2">
    <input type="hidden" name="caseId" value={caseId} /><input type="hidden" name="holdId" value={holdId ?? ""} />
    <label className="text-sm">{holdId ? "Bloke kaldırma gerekçesi" : "Hukuki bloke gerekçesi"}
      <textarea name="reason" required maxLength={2000} rows={2} className={fieldClass} />
    </label>
    <Feedback state={state} /><Button type="submit" variant="outline" disabled={pending}>{pending ? "Kaydediliyor…" : holdId ? "Bu blokeyi kaldır" : "Hukuki bloke koy"}</Button>
  </form>;
}

export function CreateRuleForm() {
  const [state, action, pending] = useActionState(createRuleAction, initial);
  return <form action={action} className="grid max-w-2xl gap-3 sm:grid-cols-2">
    <label className="text-sm">Kural kodu<input name="code" required maxLength={100} className={fieldClass} /></label>
    <label className="text-sm">Kural adı<input name="name" required maxLength={300} className={fieldClass} /></label>
    <label className="text-sm">Saklama süresi (ay)<input name="retentionMonths" type="number" min={0} max={1200} required className={fieldClass} /></label>
    <label className="text-sm">Süre sonu kararı<select name="action" defaultValue="Review" className={fieldClass}><option value="Review">Gözden geçir</option><option value="Transfer">Arşive devir</option><option value="Destroy">Fiziksel imha değerlendirmesi (dijital korunur)</option><option value="KeepPermanent">Kalıcı sakla (süre uygulanmaz)</option></select></label>
    <p className="text-xs text-muted-foreground sm:col-span-2">Süre ve karar için kurumun onaylı saklama planını esas alın. Kural kaydı tek başına imha yetkisi vermez.</p>
    <Feedback state={state} /><Button type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Saklama kuralı oluştur"}</Button>
  </form>;
}


export function CommissionForm({ process }: { process: Disposition }) {
  const [state, action, pending] = useActionState(withLocalDates(configureCommissionAction, ["validFrom", "validUntil"]), initial);
  return <form action={action} className="flex max-w-xl flex-col gap-3">
    <input type="hidden" name="id" value={process.id} /><input type="hidden" name="version" value={process.version} />
    <label className="space-y-1 text-sm">Görevlendirilen üyelerin kullanıcı kimlikleri<textarea name="members" required rows={4} defaultValue={process.members.map(member => member.subject).join("\n")} className={fieldClass} /><span className="block text-xs text-muted-foreground">Her satıra bir kullanıcı kimliği yazın. En az {process.requiredReviews} bağımsız üye; hazırlayan ve nihai onaylayan ayrı kişiler olmalıdır.</span></label>
    <label className="space-y-1 text-sm">Görev başlangıcı<input name="validFrom" type="datetime-local" required defaultValue={process.commissionValidFrom ? localDateTime(process.commissionValidFrom) : undefined} className={fieldClass} /></label>
    <label className="space-y-1 text-sm">Görev bitişi<input name="validUntil" type="datetime-local" required defaultValue={process.commissionValidUntil ? localDateTime(process.commissionValidUntil) : undefined} className={fieldClass} /></label>
    <Feedback state={state} /><Button disabled={pending}>{pending ? "Kaydediliyor…" : "Komisyon görevlendirmesini kaydet"}</Button>
  </form>;
}

export function CommissionDelegationForm({ process }: { process: Disposition }) {
  const [state, action, pending] = useActionState(withLocalDates(delegateCommissionAction, ["validFrom", "validUntil"]), initial);
  return <form action={action} className="flex max-w-xl flex-col gap-3">
    <input type="hidden" name="id" value={process.id} /><input type="hidden" name="version" value={process.version} />
    <label className="space-y-1 text-sm">Asıl üye<select name="member" required className={fieldClass}><option value="">Üye seçin</option>{process.members.map(member => <option key={member.subject} value={member.subject}>{member.subject}</option>)}</select></label>
    <label className="space-y-1 text-sm">Vekilin kullanıcı kimliği<input name="delegate" required maxLength={300} className={fieldClass} /></label>
    <label className="space-y-1 text-sm">Vekâlet görevlendirme yazısı<input name="reference" required maxLength={300} className={fieldClass} /></label>
    <label className="space-y-1 text-sm">Vekâlet başlangıcı<input name="validFrom" type="datetime-local" required className={fieldClass} /></label>
    <label className="space-y-1 text-sm">Vekâlet bitişi<input name="validUntil" type="datetime-local" required className={fieldClass} /></label>
    <Feedback state={state} /><Button variant="outline" disabled={pending}>{pending ? "Kaydediliyor…" : "Süreli vekâlet kaydet"}</Button>
  </form>;
}

export function CreateTransferPackageForm({ process }: { process: Disposition }) {
  const [state, action, pending] = useActionState(createTransferPackageAction, initial);
  return <form action={action} className="space-y-3"><input type="hidden" name="id" value={process.id} /><input type="hidden" name="version" value={process.version} />
    <p className="text-sm">Paket, tüm dijital asılları ve sürümleri, üstveri kopyasını ve her dosyanın SHA-256 özetini içerir.</p>
    <Feedback state={state} /><Button disabled={pending}>{pending ? "Dosyalar doğrulanıyor ve paketleniyor…" : "Devir paketini hazırla"}</Button></form>;
}

export function VerifyTransferPackageForm({ process }: { process: Disposition }) {
  const [state, setState] = useState<ProcessActionState>(initial); const [pending, setPending] = useState(false); const router = useRouter();
  return <form className="space-y-3" onSubmit={async event => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const file = data.get("package");
    if (!(file instanceof File) || file.size === 0) { setState({ status: "error", message: "Teslim aldığınız ZIP paketini seçin." }); return; }
    setPending(true);
    try {
      const response = await fetch(`/devir-imha/islemler/${process.id}/paket?packageId=${process.transferPackageId}&expectedVersion=${process.version}`, { method: "POST", headers: { "Content-Type": "application/zip" }, body: file });
      if (!response.ok) { const problem = await response.json().catch(() => ({})) as { detail?: string }; throw new Error(problem.detail ?? "Paket doğrulanamadı."); }
      setState({ status: "success", message: "Paketin manifesti ve bütün dosyaları hazırlanmış paketle eşleşiyor. Teslim alma tutanağını kaydedebilirsiniz." }); router.refresh();
    } catch (error) { setState({ status: "error", message: error instanceof Error ? error.message : "Paket doğrulanamadı." }); }
    finally { setPending(false); }
  }}><label className="block space-y-1 text-sm">Teslim aldığınız devir paketi<input name="package" type="file" accept=".zip,application/zip" required className={fieldClass} /></label><Feedback state={state} />
    <Button variant="outline" disabled={pending}>{pending ? "Paket doğrulanıyor…" : "Teslim alınan paketi doğrula"}</Button></form>;
}
