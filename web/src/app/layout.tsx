import type { ReactNode } from "react";
import "./globals.css";
import { JetBrains_Mono, Lexend, Source_Sans_3 } from "next/font/google";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import { getBranding } from "@/features/branding/api/branding";
import { brandingAssetUrl } from "@/features/branding/model/branding";

const heading = Lexend({
  subsets: ["latin", "latin-ext"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
});

const body = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

/**
 * Başlık, açıklama ve favicon kurum kimliği ayarından gelir.
 *
 * `template` alt sayfalara uygulanır: her sayfa yalnız kendi adını verir,
 * kurum başlığı buradan eklenir. Böylece başlık tek yerden değiştirilebilir.
 */
export async function generateMetadata() {
  const branding = await getBranding();
  const favicon = brandingAssetUrl(branding.favicon);

  return {
    title: { default: branding.siteTitle, template: `%s · ${branding.siteTitle}` },
    description: branding.description,
    ...(favicon ? { icons: { icon: favicon } } : {}),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [user, branding] = await Promise.all([getCurrentUser(), getBranding()]);

  return (
    <html
      lang="tr"
      className={cn(
        "font-sans antialiased",
        heading.variable,
        body.variable,
        mono.variable,
      )}
    >
      <body>
        <AppShell user={user} branding={branding}>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
