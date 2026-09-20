"use client";

import { useState } from "react";
import Link from "next/link";
import { Globe, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  switchDirectorySourceAction,
  type MalatyaApiSettings,
} from "@/features/organization/api/malatya-api-actions";

export function DirectorySourceSwitchCard({
  settings,
  canManage,
  onUpdated,
}: {
  settings: MalatyaApiSettings;
  canManage: boolean;
  onUpdated: (next: MalatyaApiSettings) => void;
}) {
  const [switchPending, setSwitchPending] = useState(false);

  const isApiActive = settings.isDirectorySyncEnabled;
  const isLdapActive = settings.isLdapEnabled;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-flat">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="text-base font-semibold">Aktif Dizin Kaynağı (LDAP / API)</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Malatya API veya Klasik LDAP dizinlerinden yalnızca biri devrede olabilir; bağlantı doğrulanmadan geçiş yapılmaz.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              isApiActive
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : isLdapActive
                ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span className="size-2 rounded-full bg-current" />
            {isApiActive
              ? "Malatya API Dizin Modu Aktif"
              : isLdapActive
              ? "Klasik LDAP Aktif (API Pasif)"
              : "Dizin Entegrasyonu Kapalı"}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Malatya API Kartı */}
        <div
          className={`rounded-lg border p-4 transition-colors ${
            isApiActive
              ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20"
              : "border-border bg-muted/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium text-sm">
              <Globe className="size-4 text-emerald-600 dark:text-emerald-400" />
              API Entegrasyonu
            </span>
            <span
              className={`text-xs font-semibold ${
                isApiActive ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"
              }`}
            >
              {isApiActive ? "AKTİF" : "PASİF"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Belediye servis ağ geçidi üzerinden token alarak kimlik doğrulama ve personel dizin entegrasyonu sağlar.
          </p>
          <div className="mt-4">
            <Button
              type="button"
              size="sm"
              variant={isApiActive ? "outline" : "default"}
              disabled={isApiActive || switchPending || !canManage}
              onClick={async () => {
                setSwitchPending(true);
                const res = await switchDirectorySourceAction("MalatyaApi");
                setSwitchPending(false);
                if (res.error || !res.data) {
                  toast.error(res.error ?? "API dizini etkinleştirilemedi.");
                  return;
                }
                onUpdated(res.data);
                toast.success("Malatya API aktif dizin kaynağı yapıldı. Klasik LDAP pasife alındı.");
              }}
            >
              {switchPending ? "Doğrulanıyor…" : isApiActive ? "Şu Anda Aktif" : "API Dizinini Doğrula ve Etkinleştir"}
            </Button>
          </div>
        </div>

        {/* Klasik LDAP Kartı */}
        <div
          className={`rounded-lg border p-4 transition-colors ${
            isLdapActive
              ? "border-sky-300 bg-sky-50/50 dark:border-sky-900 dark:bg-sky-950/20"
              : "border-border bg-muted/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium text-sm">
              <ShieldCheck className="size-4 text-sky-600 dark:text-sky-400" />
              Klasik LDAP / Active Directory
            </span>
            <span
              className={`text-xs font-semibold ${
                isLdapActive ? "text-sky-700 dark:text-sky-300" : "text-muted-foreground"
              }`}
            >
              {isLdapActive ? "AKTİF" : "PASİF"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Doğrudan Active Directory sunucusuna bağlanarak kullanıcı ve birim ağacını eşitler.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={isLdapActive ? "outline" : "secondary"}
              disabled={isLdapActive || switchPending || !canManage}
              onClick={async () => {
                setSwitchPending(true);
                const res = await switchDirectorySourceAction("Ldap");
                setSwitchPending(false);
                if (res.error || !res.data) {
                  toast.error(res.error ?? "LDAP dizini etkinleştirilemedi.");
                  return;
                }
                onUpdated(res.data);
                toast.success("Klasik LDAP aktif dizin kaynağı yapıldı. Malatya API dizini pasife alındı.");
              }}
            >
              {switchPending ? "Geçiliyor…" : isLdapActive ? "Şu Anda Aktif" : "Klasik LDAP'a Geç"}
            </Button>
            <Link
              href="/tanimlamalar/ldap"
              className="text-xs font-medium text-primary hover:underline"
            >
              LDAP ayarlarını aç →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

