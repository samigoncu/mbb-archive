"use client";
import { useActionState, useState } from "react";
import { operationsAction } from "./actions";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";
export function RecoveryCompletion({ id, targetRpo, targetRto }: { id: string; targetRpo: number; targetRto: number }) {
  const [state, action, pending] = useActionState(operationsAction, { status: "idle" } as ActionState);
  const [rpo, setRpo] = useState(""); const [rto, setRto] = useState(""); const [passed, setPassed] = useState("true");
  const exceeded = Number(rpo) > targetRpo || Number(rto) > targetRto;
  const field = "mt-1 block min-h-10 w-full rounded border bg-background p-2";
  return <form action={action} className="grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="operation" value="dr-complete" /><input type="hidden" name="id" value={id} />
    <label className="text-sm">Ölçülen RPO (dakika)<input className={field} name="rpo" type="number" min="0" required value={rpo} onChange={e => setRpo(e.target.value)} /></label>
    <label className="text-sm">Ölçülen RTO (dakika)<input className={field} name="rto" type="number" min="0" required value={rto} onChange={e => setRto(e.target.value)} /></label>
    <label className="text-sm sm:col-span-2">Tatbikat sonucu<select name="passed" className={field} value={passed} onChange={e => setPassed(e.target.value)}><option value="true">Başarılı</option><option value="false">Başarısız</option></select></label>
    {exceeded && <p role="alert" className="text-sm text-destructive sm:col-span-2">RPO/RTO hedefi aşıldı. Bu tatbikatı başarısız olarak kaydedin.</p>}
    <label className="text-sm sm:col-span-2">Kanıt referansı<input className={field} name="evidence" required maxLength={1000} placeholder="Geri yükleme raporu veya kanıt kaydının adresi" /></label>
    <label className="text-sm sm:col-span-2">Geri yükleme ve doğrulama sonuçları<textarea className={field} name="notes" required maxLength={4000} /></label>
    <button className="min-h-11 rounded bg-primary px-4 text-primary-foreground disabled:opacity-50 sm:col-span-2" disabled={pending || (passed === "true" && exceeded)}>{pending ? "Kaydediliyor…" : "Tatbikat sonucunu kaydet"}</button>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className="text-sm sm:col-span-2">{state.message}</p>}
  </form>;
}
