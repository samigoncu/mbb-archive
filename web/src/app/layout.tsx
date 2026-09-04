import type { ReactNode } from "react";
import "./globals.css";
import { JetBrains_Mono, Lexend, Source_Sans_3 } from "next/font/google";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/app-shell";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentUser } from "@/features/access/api/get-current-user";

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

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();

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
        <AppShell user={user}>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
