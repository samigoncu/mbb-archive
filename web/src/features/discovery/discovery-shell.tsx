import Link from "next/link";
import { Archive, ArrowLeft, ShieldCheck } from "lucide-react";
import { ProfileMenu } from "@/components/layout/profile-menu";
import type { CurrentUser } from "@/features/access/model/current-user";
import {
  brandingAssetUrl,
  defaultBranding,
  type Branding,
} from "@/features/branding/model/branding";
import styles from "./discovery.module.css";

export function DiscoveryShell({
  children,
  user,
  branding = defaultBranding,
}: {
  children: React.ReactNode;
  user: CurrentUser | null;
  branding?: Branding;
}) {
  const logo = brandingAssetUrl(branding.logo);

  return (
    <div className={styles.shell}>
      <header className="flex min-h-[88px] w-full items-center justify-between border-b border-[#dce5ea] bg-white px-6 sm:px-8">
        <Link href="/kesfet" className="flex items-center gap-3.5 shrink-0 group">
          {logo ? (
            <img
              src={logo}
              alt={`${branding.institutionName} — ${branding.siteTitle}`}
              width={300}
              height={77}
              className="h-10 sm:h-11 w-auto object-contain shrink-0"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Archive className="size-6" />
            </div>
          )}
          <div className="flex flex-col border-l border-[#dce5ea] pl-3.5 py-0.5 min-w-0">
            <strong className="text-base sm:text-lg font-bold text-[#172d44] leading-tight group-hover:text-[#007f94] transition-colors truncate">
              {branding.siteTitle}
            </strong>
            <small className="hidden sm:block text-[10px] sm:text-[11px] font-medium tracking-wider text-[#637785] uppercase truncate max-w-[260px] md:max-w-[420px]">
              {branding.description || branding.institutionName}
            </small>
          </div>
        </Link>

        <div className="ml-auto flex items-center gap-6">
          <nav aria-label="Arşiv menüsü" className="flex items-center gap-5 text-sm font-semibold text-[#172d44]">
            <Link href="/kesfet" className="hover:text-[#007f94] transition-colors">
              Arşivi keşfet
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 hover:text-[#007f94] transition-colors"
            >
              <ArrowLeft size={16} />
              Çalışma alanı
            </Link>
          </nav>
          <ProfileMenu user={user} />
        </div>
      </header>
      <main>{children}</main>
      <footer className={styles.footer}>
        <span>
          {branding.siteTitle} · {branding.description || branding.institutionName}
        </span>
        <span>
          <ShieldCheck size={16} />
          Yetkiniz kapsamındaki belgelere güvenli erişim
        </span>
      </footer>
    </div>
  );
}
