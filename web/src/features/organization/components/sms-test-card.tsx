"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquare, Send, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { testMalatyaSmsAction } from "@/features/organization/api/malatya-api-actions";

const field = "mt-1.5";

export function SmsTestCard({
  defaultProvider,
  canManage,
}: {
  defaultProvider: string;
  canManage: boolean;
}) {
  const [smsPending, setSmsPending] = useState(false);
  const [smsForm, setSmsForm] = useState({
    message: "MBB Arşiv Sistemi Test Bildirimi",
    phone: "",
    isOtp: false,
    provider: "",
  });
  const [smsResult, setSmsResult] = useState<{
    succeeded: boolean;
    providerReference?: string | null;
    error?: string | null;
  } | null>(null);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-flat">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-5 text-primary" />
        <h3 className="text-base font-semibold">SMS & OTP Gönderim Testi</h3>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Malatya API uç noktaları (/OTP/send ve /SMS/send) üzerinden anlık test mesajı iletin.
      </p>

      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (smsPending || !canManage) return;
          if (!smsForm.phone.trim()) {
            toast.error("Alıcı telefon numarası zorunludur.");
            return;
          }

          setSmsPending(true);
          setSmsResult(null);

          const res = await testMalatyaSmsAction({
            message: smsForm.message,
            to: [smsForm.phone.trim()],
            isOtp: smsForm.isOtp,
            provider: smsForm.provider.trim() || undefined,
          });

          setSmsPending(false);
          setSmsResult(res);

          if (res.succeeded) {
            toast.success("SMS başarıyla iletildi!");
          } else {
            toast.error(res.error ?? "SMS gönderilemedi.");
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium sm:col-span-2">
            Alıcı Telefon Numarası
            <Input
              className={field}
              value={smsForm.phone}
              disabled={!canManage}
              placeholder="05XXXXXXXXX"
              onChange={(e) => setSmsForm({ ...smsForm, phone: e.target.value })}
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              Örnek: 05321234567
            </span>
          </label>

          <label className="text-sm font-medium">
            SMS Tipi
            <select
              className={`${field} h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
              value={smsForm.isOtp ? "otp" : "normal"}
              disabled={!canManage}
              onChange={(e) => setSmsForm({ ...smsForm, isOtp: e.target.value === "otp" })}
            >
              <option value="normal">Normal SMS (/SMS/send)</option>
              <option value="otp">OTP SMS (/OTP/send)</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Özel Sağlayıcı (Opsiyonel)
            <Input
              className={field}
              value={smsForm.provider}
              disabled={!canManage}
              placeholder={defaultProvider || "MBB"}
              onChange={(e) => setSmsForm({ ...smsForm, provider: e.target.value })}
            />
          </label>

          <label className="text-sm font-medium sm:col-span-2 lg:col-span-4">
            Mesaj Metni
            <Input
              className={field}
              value={smsForm.message}
              disabled={!canManage}
              placeholder="Test SMS mesaj metnini girin..."
              onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
            />
          </label>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={smsPending || !canManage}>
            <Send className="mr-1.5 size-4" />
            {smsPending ? "Gönderiliyor…" : "Test SMS Gönder"}
          </Button>
        </div>

        {smsResult && (
          <div
            className={`rounded-lg border p-4 text-xs leading-relaxed ${
              smsResult.succeeded
                ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                : "border-destructive/30 bg-destructive/5 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {smsResult.succeeded ? (
                <>
                  <CheckCircle2 className="size-4" />
                  SMS Başarıyla Gönderildi:
                </>
              ) : (
                <>
                  <TriangleAlert className="size-4" />
                  SMS Gönderim Hatası:
                </>
              )}
            </div>
            <p className="mt-1 font-mono">
              {smsResult.succeeded ? smsResult.providerReference || "İşlem başarılı" : smsResult.error}
            </p>
          </div>
        )}
      </form>
    </section>
  );
}

