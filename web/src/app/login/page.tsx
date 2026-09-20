import Link from "next/link";
import { CredentialsForm } from "./credentials-form";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { isAuthConfigured } from "@/lib/auth/oidc";
import { readSession } from "@/lib/auth/session";
import { Archive, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { safeReturnTo } from "@/lib/auth/return-to";
import { getBranding } from "@/features/branding/api/branding";
import { brandingAssetUrl } from "@/features/branding/model/branding";

export const metadata = { title: "Giriş" };

/**
 * Giriş ekranı. Kimlik doğrulama kurum kimlik sağlayıcısına devredilir;
 * uygulama parola toplamaz ve saklamaz.
 */
const statusMessages: Record<string, string> = {
  yapilandirilmadi:
    "Kurum kimlik sağlayıcısı bu ortamda tanımlı değil. Sistem yöneticisiyle görüşün.",
  reddedildi: "Kimlik sağlayıcı girişi reddetti. Yetkiniz olmayabilir.",
  gecersiz:
    "Giriş isteği doğrulanamadı; sayfa çok uzun süre açık kalmış olabilir. Yeniden deneyin.",
  basarisiz:
    "Kimlik sağlayıcıyla iletişim kurulamadı. Kısa süre sonra yeniden deneyin.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; returnTo?: string }>;
}) {
  const { durum, returnTo } = await searchParams;
  const [user, session] = await Promise.all([getCurrentUser(), readSession()]);
  const configured = isAuthConfigured();
  const message = durum ? statusMessages[durum] : undefined;

  const loginHref = returnTo
    ? `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`
    : "/api/auth/login";

  const destination = safeReturnTo(returnTo);
  // Marka görselleri dışarıdan adreslenebildiği için next/image yerine düz img:
  // rastgele host'lar remotePatterns ile tek tek tanımlanmak zorunda kalmasın.
  const branding = await getBranding();
  const logo = brandingAssetUrl(branding.logo);
  const hero = brandingAssetUrl(branding.loginImage);
  const buttonClass = "mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#7367f0] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-violet-500/20 transition-colors hover:bg-[#6558df] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2";
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.3fr)_minmax(420px,1fr)]">
      <section aria-label="Dijital arşiv" className="relative hidden flex-col justify-between overflow-hidden bg-[#f3f2fa] p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-3 text-[#443b66]"><span className="rounded-xl bg-[#7367f0] p-2.5 text-white"><Archive className="size-6" aria-hidden /></span><span className="text-xl font-semibold tracking-tight">{branding.siteTitle}</span></div>
        <div className="mx-auto w-full max-w-2xl py-5">
          {hero && <img src={hero} alt="" width={900} height={700} className="h-auto max-h-[55dvh] w-full object-contain" />}
          <div className="mx-auto max-w-md text-center"><h2 className="text-2xl font-semibold leading-tight text-[#443b66]">Kurumsal hafıza,<br />güvenle geleceğe.</h2><p className="mt-4 text-sm leading-6 text-[#77708b]">Dijital belgeleriniz ve fiziksel arşiviniz,<br />tek bir çalışma alanında.</p></div>
        </div>
        <p className="text-xs text-[#827b95]">{branding.institutionName} · {branding.description}</p>
      </section>
      <section aria-label="Kurum girişi" className="flex min-w-0 flex-col justify-center px-6 py-12 sm:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-2 text-lg font-semibold lg:hidden"><Archive className="size-7 text-[#7367f0]" aria-hidden />{branding.siteTitle}</div>
          {logo && <img src={logo} alt={`${branding.institutionName} — ${branding.siteTitle}`} width={300} height={77} className="mx-auto mt-8 mb-10 h-auto w-[240px] max-w-full object-contain" />}
          {message && <div role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />{message}</div>}
          {session ? <>
            <p className="mt-6 rounded-lg border border-border bg-muted/30 p-4 text-sm">Kurum oturumunuz açık.</p>
            <Link href={destination} className={buttonClass}>Arşivi aç<ArrowRight className="size-4" aria-hidden /></Link>
            <form action="/api/auth/logout" method="post" className="mt-4 text-center"><button type="submit" className="rounded text-sm text-muted-foreground underline focus-visible:ring-2 focus-visible:ring-ring">Oturumu kapat</button></form>
          </> : configured ? <>
            <Link href={loginHref} prefetch={false} className={buttonClass}>Kurum hesabıyla giriş<ArrowRight className="size-4" aria-hidden /></Link>
            <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">Kurumunuzun güvenli giriş ekranına yönlendirileceksiniz.</p>
          </> : <>
            <CredentialsForm destination={destination} enabled={!!user?.isAuthenticated} />
          </>}
          <div className="mt-9 border-t border-border pt-6"><p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><ShieldCheck className="size-4 shrink-0" aria-hidden />Kurum hesabınızla güvenli erişim</p><p className="mt-3 text-xs leading-5 text-muted-foreground">Hesap veya erişim desteği için kurumunuzun sistem yöneticisine başvurun.</p></div>
        </div>
      </section>
    </div>
  );
}
