import type { ReactNode } from "react";
import "./globals.css";
import { JetBrains_Mono, Lexend, Source_Sans_3 } from "next/font/google";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";

// Corporate Trust eşleşmesi: Lexend okunabilirlik için tasarlandı ve başlıkları
// taşır, Source Sans 3 yoğun gövde metnini, JetBrains Mono barkod/kimlik alanlarını.
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

export const metadata = {
  title: "MBB Kurumsal Arşiv",
  description: "Kurumsal Belge, Arşiv ve Dijital Hafıza Platformu",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
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
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
