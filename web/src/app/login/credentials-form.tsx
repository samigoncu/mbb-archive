"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { safeReturnTo } from "@/lib/auth/return-to";

/** Temporary development entry; does not authenticate or transmit credentials. */
export function CredentialsForm({ destination, enabled }: { destination: string; enabled: boolean }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled) return;
    event.currentTarget.reset();
    setShowPassword(false);
    router.push(safeReturnTo(destination));
  }
  const inputClass = "mt-2 h-12 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-shadow focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";
  return <form onSubmit={submit} aria-label="Kullanıcı girişi" className="mt-6 space-y-4" autoComplete="off">
    <label className="block text-sm font-medium" htmlFor="login-username">Kullanıcı adı
      <input id="login-username" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Kullanıcı adınızı girin" className={inputClass} />
    </label>
    <div><label className="block text-sm font-medium" htmlFor="login-password">Parola</label>
      <div className="relative"><input id="login-password" type={showPassword ? "text" : "password"} autoComplete="off" placeholder="Parolanızı girin" className={`${inputClass} pr-12`} />
        <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Parolayı gizle" : "Parolayı göster"} aria-pressed={showPassword} className="absolute right-1 top-3 rounded-md p-3 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">{showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}</button>
      </div>
    </div>
    <button type="submit" disabled={!enabled} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#7367f0] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition-colors hover:bg-[#6558df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">Giriş yap<ArrowRight className="size-4" aria-hidden /></button>
    <p className="text-xs leading-5 text-muted-foreground">{enabled ? "Demo giriş · LDAP bağlantısı hazırlık aşamasında." : "LDAP bağlantısı henüz etkin değil. Erişim için sistem yöneticinizle iletişime geçin."}</p>
  </form>;
}
