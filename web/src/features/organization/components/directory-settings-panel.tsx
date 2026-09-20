"use client";

import { useState } from "react";
import { Info, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveDirectorySettingsAction,
  type DirectorySettings,
} from "@/features/organization/api/directory-settings-actions";

const field = "mt-1.5";

/**
 * LDAP dizin bağlantısı ayarları.
 *
 * <para>
 * Burada yapılan hiçbir şey parola doğrulamaz: kimlik doğrulama LDAP
 * sunucusunda kalır. Uygulama yalnız kullanıcı ve birim künyelerini okumak
 * için bağlanır; bu yüzden gereken tek sır servis hesabının bağlama parolasıdır
 * ve şifrelenerek saklanır.
 * </para>
 */
export function DirectorySettingsPanel({ initial, canManage }: {
  initial: DirectorySettings | null;
  canManage: boolean;
}) {
  const [settings, setSettings] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");

  const [form, setForm] = useState(() => ({
    isEnabled: initial?.isEnabled ?? false,
    host: initial?.host ?? "",
    port: initial?.port ?? 636,
    useSsl: initial?.useSsl ?? true,
    bindDn: initial?.bindDn ?? "",
    userSearchBase: initial?.userSearchBase ?? "",
    unitSearchBase: initial?.unitSearchBase ?? "",
    userFilter: initial?.userFilter ?? "",
    unitFilter: initial?.unitFilter ?? "",
    unitAttribute: initial?.unitAttribute ?? "",
    groupAttribute: initial?.groupAttribute ?? "",
    displayNameAttribute: initial?.displayNameAttribute ?? "",
    mailAttribute: initial?.mailAttribute ?? "",
    timeoutSeconds: initial?.timeoutSeconds ?? 20,
    provisionOnLogin: initial?.provisionOnLogin ?? true,
  }));

  if (!settings) return <p role="alert">Dizin ayarları okunamadı. Sayfayı yenileyin.</p>;

  return <form className="flex flex-col gap-6" onSubmit={async event => {
    event.preventDefault();
    if (pending || !canManage) return;
    setPending(true); setError("");

    const result = await saveDirectorySettingsAction({
      ...form,
      // Boş bırakılan parola alanı mevcut parolayı korur.
      bindPassword: password.length > 0 ? password : null,
      version: settings.version,
      expectedVersion: settings.version,
    });
    setPending(false);
    if (result.error || !result.data) { setError(result.error ?? "Kaydedilemedi."); return; }

    setSettings(result.data);
    setPassword("");
    toast.success("Dizin ayarları kaydedildi.");
  }}>
    {settings.bindPasswordUnreadable && (
      <aside role="alert" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Kayıtlı bağlama parolası <strong>çözülemiyor</strong>; şifreleme anahtarı değişmiş ya da
          kaybolmuş olabilir. Dizin bu durumda kimliksiz bağlanmaz, kapalı kabul edilir.
          Parolayı yeniden girip kaydedin.
        </p>
      </aside>
    )}

    <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
      <input type="checkbox" checked={form.isEnabled} disabled={!canManage} className="mt-0.5 size-4 shrink-0"
        onChange={event => setForm({ ...form, isEnabled: event.target.checked })} />
      <span className="text-sm">
        <span className="block font-medium">Dizin entegrasyonunu etkinleştir</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
          Kapalıyken kullanıcı ve birim eşitlemesi çalışmaz; atamalar elle yapılır.
        </span>
      </span>
    </label>

    <section className="space-y-4">
      <h3 className="text-sm font-semibold">Sunucu</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-medium lg:col-span-2">Sunucu adresi
          <Input className={field} value={form.host} disabled={!canManage} placeholder="ldap.kurum.gov.tr"
            onChange={event => setForm({ ...form, host: event.target.value })} />
        </label>
        <label className="text-sm font-medium">Port
          <Input className={field} type="number" min={1} max={65535} value={form.port} disabled={!canManage}
            onChange={event => setForm({ ...form, port: Number(event.target.value) })} />
        </label>
        <label className="flex items-end gap-2 pb-1 text-sm font-medium">
          <input type="checkbox" checked={form.useSsl} disabled={!canManage} className="size-4"
            onChange={event => setForm({ ...form, useSsl: event.target.checked })} />
          LDAPS (SSL)
        </label>
        <label className="text-sm font-medium sm:col-span-2 lg:col-span-3">Bağlama kullanıcısı (bind DN)
          <Input className={field} value={form.bindDn} disabled={!canManage}
            placeholder="CN=svc-arsiv,OU=Servis,DC=kurum,DC=gov,DC=tr"
            onChange={event => setForm({ ...form, bindDn: event.target.value })} />
          <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
            Yalnız okuma yetkisi olan servis hesabı yeterlidir.
          </span>
        </label>
        <label className="text-sm font-medium">Bağlama parolası
          <Input className={field} type="password" autoComplete="new-password" value={password} disabled={!canManage}
            onChange={event => setPassword(event.target.value)} />
          <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
            {settings.bindPasswordUnreadable
              ? "Çözülemiyor; yeniden girilmeli."
              : settings.hasBindPassword ? "Tanımlı. Boş bırakılırsa korunur." : "Şifrelenerek saklanır."}
          </span>
        </label>
      </div>
    </section>

    <section className="space-y-4">
      <h3 className="text-sm font-semibold">Arama tabanları ve süzgeçler</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Kullanıcı arama tabanı
          <Input className={field} value={form.userSearchBase} disabled={!canManage}
            placeholder="OU=Personel,DC=kurum,DC=gov,DC=tr"
            onChange={event => setForm({ ...form, userSearchBase: event.target.value })} />
        </label>
        <label className="text-sm font-medium">Birim arama tabanı
          <Input className={field} value={form.unitSearchBase} disabled={!canManage}
            placeholder="OU=Birimler,DC=kurum,DC=gov,DC=tr"
            onChange={event => setForm({ ...form, unitSearchBase: event.target.value })} />
        </label>
        <label className="text-sm font-medium">Kullanıcı süzgeci
          <Input className={`${field} font-mono text-xs`} value={form.userFilter} disabled={!canManage}
            onChange={event => setForm({ ...form, userFilter: event.target.value })} />
          <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
            Kullanıcı kimliğinin geleceği <span className="font-mono">{"{0}"}</span> yer tutucusu zorunludur.
          </span>
        </label>
        <label className="text-sm font-medium">Birim süzgeci
          <Input className={`${field} font-mono text-xs`} value={form.unitFilter} disabled={!canManage}
            onChange={event => setForm({ ...form, unitFilter: event.target.value })} />
        </label>
      </div>
    </section>

    <section className="space-y-4">
      <h3 className="text-sm font-semibold">Öznitelik eşlemesi</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([
          ["displayNameAttribute", "Ad soyad", "displayName"],
          ["mailAttribute", "E-posta", "mail"],
          ["unitAttribute", "Birim", "department"],
          ["groupAttribute", "Gruplar", "memberOf"],
        ] as const).map(([key, label, placeholder]) => (
          <label key={key} className="text-sm font-medium">{label}
            <Input className={`${field} font-mono text-xs`} value={form[key]} disabled={!canManage}
              placeholder={placeholder}
              onChange={event => setForm({ ...form, [key]: event.target.value })} />
          </label>
        ))}
      </div>
    </section>

    <section className="space-y-4">
      <h3 className="text-sm font-semibold">Davranış</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Zaman aşımı (saniye)
          <Input className={field} type="number" min={1} max={300} value={form.timeoutSeconds} disabled={!canManage}
            onChange={event => setForm({ ...form, timeoutSeconds: Number(event.target.value) })} />
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-border p-3">
          <input type="checkbox" checked={form.provisionOnLogin} disabled={!canManage} className="mt-0.5 size-4 shrink-0"
            onChange={event => setForm({ ...form, provisionOnLogin: event.target.checked })} />
          <span className="text-sm">
            <span className="block font-medium">İlk girişte kullanıcı kaydı aç</span>
            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
              Dizinde bulunan kişi giriş yaptığında ad ve e-postası uygulamaya yazılır.
              Rol ataması yapılmaz; erişim yine yöneticinin vermesine bağlıdır.
            </span>
          </span>
        </label>
      </div>
    </section>

    <aside className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-xs leading-5 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        Kimlik doğrulama bu ekranda yapılmaz: kullanıcı parolası hiçbir zaman uygulamaya gelmez,
        LDAP sunucusunda doğrulanır. Buradaki servis hesabı yalnız künyeleri okumak içindir.
      </p>
    </aside>

    {settings.updatedAt && (
      <p className="text-xs text-muted-foreground">
        Son değişiklik: {settings.updatedBy} · {new Date(settings.updatedAt).toLocaleString("tr-TR")}
      </p>
    )}
    {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    {canManage
      ? <Button type="submit" className="self-start" disabled={pending}>{pending ? "Kaydediliyor…" : "Dizin ayarlarını kaydet"}</Button>
      : <p className="text-sm">Dizin ayarlarını yalnız `organization.manage` yetkisi olan kullanıcı değiştirebilir.</p>}
  </form>;
}
