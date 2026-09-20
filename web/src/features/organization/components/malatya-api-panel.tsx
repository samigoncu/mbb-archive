"use client";

import { useState } from "react";
import { CheckCircle2, Info, KeyRound, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveMalatyaApiSettingsAction,
  testMalatyaApiConnectionAction,
  type MalatyaApiSettings,
} from "@/features/organization/api/malatya-api-actions";
import { DirectorySourceSwitchCard } from "./directory-source-switch-card";
import { SmsTestCard } from "./sms-test-card";

const field = "mt-1.5";

export function MalatyaApiPanel({
  initial,
  canManage,
}: {
  initial: MalatyaApiSettings | null;
  canManage: boolean;
}) {
  const [settings, setSettings] = useState(initial);
  const [pending, setPending] = useState(false);
  const [testPending, setTestPending] = useState(false);
  const [password, setPassword] = useState("");

  const [form, setForm] = useState(() => ({
    baseUrl: initial?.baseUrl ?? "https://api.malatya.bel.tr",
    userName: initial?.userName ?? "",
    smsProvider: initial?.smsProvider ?? "MBB",
  }));

  const [testResult, setTestResult] = useState<{
    succeeded: boolean;
    token?: string | null;
    expires?: string | null;
    error?: string | null;
  } | null>(null);

  if (!settings) {
    return (
      <p role="alert" className="text-sm text-destructive">
        Malatya API ayarları okunamadı. Sayfayı yenileyin.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Dizin Kaynağı ve Karşılıklı Dışlama Kartı */}
      <DirectorySourceSwitchCard
        settings={settings}
        canManage={canManage}
        onUpdated={(next) => setSettings(next)}
      />

      {/* 2. Malatya API Bağlantı Bilgileri */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-flat">
        <h3 className="text-base font-semibold">Malatya API Bağlantı Ayarları</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Token alma (/Auth/login) ve SMS servisleri için gerekli API erişim bilgileri.
        </p>

        <form
          className="mt-5 flex flex-col gap-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pending || !canManage) return;
            setPending(true);
            const res = await saveMalatyaApiSettingsAction({
              baseUrl: form.baseUrl,
              userName: form.userName,
              password: password.length > 0 ? password : null,
              smsProvider: form.smsProvider,
              expectedVersion: settings.version,
            });
            setPending(false);
            if (res.error || !res.data) {
              toast.error(res.error ?? "Ayarlar kaydedilemedi.");
              return;
            }
            setSettings(res.data);
            setPassword("");
            toast.success("Malatya API ayarları başarıyla kaydedildi.");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium sm:col-span-2">
              Servis Adresi (Base URL)
              <Input
                className={field}
                value={form.baseUrl}
                disabled={!canManage}
                placeholder="https://api.malatya.bel.tr"
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
              />
            </label>

            <label className="text-sm font-medium">
              Kullanıcı Adı (userName)
              <Input
                className={field}
                value={form.userName}
                disabled={!canManage}
                placeholder="api_kullanici"
                onChange={(e) => setForm({ ...form, userName: e.target.value })}
              />
            </label>

            <label className="text-sm font-medium">
              Parola (password)
              <Input
                className={field}
                type="password"
                autoComplete="new-password"
                value={password}
                disabled={!canManage}
                placeholder={settings.hasPassword ? "•••••••• (Tanımlı)" : "Parola girin"}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                {settings.hasPassword ? "Boş bırakılırsa mevcut parola korunur." : "Şifrelenerek saklanır."}
              </span>
            </label>

            <label className="text-sm font-medium">
              Varsayılan SMS Sağlayıcı Kodu (provider)
              <Input
                className={field}
                value={form.smsProvider}
                disabled={!canManage}
                placeholder="MBB"
                onChange={(e) => setForm({ ...form, smsProvider: e.target.value })}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              disabled={testPending || !canManage}
              onClick={async () => {
                setTestPending(true);
                setTestResult(null);
                const res = await testMalatyaApiConnectionAction({
                  baseUrl: form.baseUrl,
                  userName: form.userName,
                  password: password.length > 0 ? password : undefined,
                });
                setTestPending(false);
                setTestResult(res);
                if (res.succeeded) {
                  toast.success("Bağlantı başarılı! Token alındı.");
                } else {
                  toast.error(res.error ?? "Bağlantı testi başarısız.");
                }
              }}
            >
              <KeyRound className="mr-1.5 size-4" />
              {testPending ? "Bağlanıyor…" : "Bağlantıyı Test Et (Token Al)"}
            </Button>

            <Button type="submit" disabled={pending || !canManage}>
              {pending ? "Kaydediliyor…" : "API Ayarlarını Kaydet"}
            </Button>

            {settings.updatedAt && (
              <span className="ml-auto text-xs text-muted-foreground">
                Son Güncelleme: {settings.updatedBy} · {new Date(settings.updatedAt).toLocaleString("tr-TR")}
              </span>
            )}
          </div>

          {testResult && (
            <div
              className={`rounded-lg border p-4 text-xs leading-relaxed ${
                testResult.succeeded
                  ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {testResult.succeeded ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    Bağlantı Başarılı: Malatya API token doğrulandı.
                  </>
                ) : (
                  <>
                    <TriangleAlert className="size-4" />
                    Bağlantı Hatası:
                  </>
                )}
              </div>
              {testResult.succeeded ? (
                <div className="mt-2 space-y-1">
                  <p>
                    <span className="font-medium">Geçerlilik Süresi:</span>{" "}
                    {testResult.expires ? new Date(testResult.expires).toLocaleString("tr-TR") : "Belirtilmedi"}
                  </p>
                  <p className="truncate font-mono">
                    <span className="font-medium font-sans">Token Özeti:</span> {testResult.token?.slice(0, 32)}…
                  </p>
                </div>
              ) : (
                <p className="mt-1">{testResult.error}</p>
              )}
            </div>
          )}
        </form>
      </section>

      {/* 3. Canlı SMS ve OTP Test Konsolu */}
      <SmsTestCard defaultProvider={form.smsProvider} canManage={canManage} />

      <aside className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-xs leading-5 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Malatya Büyükşehir Belediyesi API entegrasyonu, sistemin bildirim mimarisi (SMS/OTP) ile doğrudan bağlantılıdır.
          Dizin kaynağı olarak seçildiğinde ise klasik LDAP pasife alınarak belediye API gateway doğrulaması esas alınır.
        </p>
      </aside>
    </div>
  );
}

