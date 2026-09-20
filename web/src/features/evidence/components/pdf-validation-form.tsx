"use client";
import { useActionState } from "react";
import { Panel } from "@/components/ui/page";
import { validatePdfAction } from "../api/validate-pdf-action";

export function PdfValidationForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(validatePdfAction, {status: "idle", message: ""});
  return <Panel title="İmzalı PDF doğrula" padded><form action={action} className="space-y-4">
    <p className="text-sm text-muted-foreground">Belge, kurumun yapılandırdığı DSS servisine gönderilir. Sonuç ve sağlayıcı raporu doğrulama geçmişine kaydedilir.</p>
    {!configured && <p role="status" className="text-sm">Kurum PDF doğrulama sağlayıcısı yapılandırılmalıdır.</p>}
    <label className="block text-sm">PDF dosyası (en fazla 32 MB)<input name="pdf" type="file" accept="application/pdf,.pdf" required disabled={!configured || pending} className="mt-2 block w-full min-w-0 rounded-lg border p-3" /></label>
    <button disabled={!configured || pending} className="min-h-11 rounded-lg bg-primary px-4 text-primary-foreground disabled:opacity-50">{pending ? "Doğrulanıyor…" : "PDF imzalarını doğrula"}</button>
    {state.message && <p role={state.status === "error" ? "alert" : "status"} className="text-sm">{state.message}</p>}
  </form></Panel>;
}
