import { apiGet } from "@/lib/api/api-client";
import { Badge } from "@/components/ui/badge";
import { ActionForm } from "@/components/action-form";
import { directoryAction } from "../api/directory-actions";
import {
  ChevronDown,
  Database,
  History,
  Info,
  Network,
  RefreshCw,
  Server,
  UserCheck,
} from "lucide-react";

type Run = {
  id: string;
  kind: string;
  subjectId: string;
  requestedBy: string;
  status: string;
  summary: string;
  completedAt: string;
};

function summary(run: Run) {
  if (run.status === "Failed") return run.summary;
  try {
    const value = JSON.parse(run.summary) as {
      UnitsCreated: number;
      UnitsLinked: number;
      MembershipsAssigned: number;
      MembershipsRemoved: number;
      Warnings: string[];
    };
    return `${value.UnitsCreated} yeni birim, ${value.UnitsLinked} bağlantı, ${value.MembershipsAssigned} yeni üyelik, ${value.MembershipsRemoved} kaldırılan üyelik. ${value.Warnings?.join(" ") || ""}`;
  } catch {
    return run.summary || "İşlem tamamlandı.";
  }
}

export async function DirectoryPanel() {
  const [status, history] = await Promise.all([
    apiGet<{ userSyncConfigured: boolean; unitSyncConfigured: boolean }>(
      "/organization/directory/status",
      { cache: "no-store" },
    ),
    apiGet<Run[]>("/organization/directory/history", { cache: "no-store" }),
  ]);

  const field =
    "mt-1 block min-h-8.5 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Network className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Kurumsal Dizin (LDAP / Active Directory) Entegrasyonu
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Merkezi dizinden birim ağacı ve personel üyelikleri otomatik eşitlenir.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Birim Eşitlemesi:</span>
          {status.unitSyncConfigured ? (
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
            >
              ● Yapılandırılmış
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-normal">
              Yapılandırılmamış
            </Badge>
          )}

          <span className="ml-2 text-muted-foreground">Kullanıcı Eşitlemesi:</span>
          {status.userSyncConfigured ? (
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
            >
              ● Yapılandırılmış
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-normal">
              Yapılandırılmamış
            </Badge>
          )}
        </div>
      </div>

      <details className="group mt-3 border-t border-border/60 pt-3">
        <summary className="flex cursor-pointer select-none items-center justify-between text-xs font-semibold text-primary hover:underline">
          <span className="flex items-center gap-1.5">
            <RefreshCw className="size-3.5" />
            Eşitleme İşlemleri ve Geçmiş Kayıtları ({history.length})
          </span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-4 space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Unit Sync Card */}
            <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
              <h3 className="text-xs font-semibold text-foreground">
                Birimleri Dizinden Eşitle
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Yeni kurum dizin birimlerini arşiv sistemine aktarır ve eşleşen birimleri bağlar. Mevcut birimler silinmez.
              </p>
              <div className="mt-3">
                {status.unitSyncConfigured ? (
                  <ActionForm action={directoryAction} label="Birimleri Eşitle">
                    <input type="hidden" name="operation" value="sync-units" />
                    <label className="flex items-start gap-2 text-xs cursor-pointer py-1">
                      <input
                        type="checkbox"
                        name="confirm"
                        required
                        className="mt-0.5 rounded border-border"
                      />
                      <span>Dizin birimlerini arşive aktarmayı onaylıyorum.</span>
                    </label>
                  </ActionForm>
                ) : (
                  <p className="rounded border border-dashed border-border bg-background p-2.5 text-xs text-muted-foreground">
                    Birim eşitlemesi için sistem ayarlarından LDAP bağlantısı ve arama tabanı tanımlanmalıdır.
                  </p>
                )}
              </div>
            </div>

            {/* User Sync Card */}
            <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
              <h3 className="text-xs font-semibold text-foreground">
                Kullanıcı Üyeliğini Eşitle
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Kullanıcının LDAP birim üyeliklerini günceller. Elle tanımlı özel üyelikler ve birincil birim korunur.
              </p>
              <div className="mt-3">
                {status.userSyncConfigured ? (
                  <ActionForm action={directoryAction} label="Üyeliği Eşitle">
                    <input type="hidden" name="operation" value="sync-user" />
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="font-medium text-foreground">
                          Arşivdeki Kullanıcı Özne Kimliği (Subject ID)
                        </label>
                        <input
                          name="subjectId"
                          required
                          maxLength={200}
                          placeholder="ör. user@kurum.gov.tr"
                          className={field}
                        />
                      </div>
                      <div>
                        <label className="font-medium text-foreground">
                          Dizin Kullanıcı Adı (sAMAccountName)
                        </label>
                        <input
                          name="directoryUserName"
                          required
                          maxLength={200}
                          placeholder="ör. ahmet.yilmaz"
                          className={field}
                        />
                      </div>
                      <label className="flex items-start gap-2 text-xs cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          name="confirm"
                          required
                          className="mt-0.5 rounded border-border"
                        />
                        <span>
                          İki kimliğin aynı kişiye ait olduğunu ve üyeliklerin güncellenmesini onaylıyorum.
                        </span>
                      </label>
                    </div>
                  </ActionForm>
                ) : (
                  <p className="rounded border border-dashed border-border bg-background p-2.5 text-xs text-muted-foreground">
                    Kullanıcı eşitlemesi için kurum dizini bağlantısı tanımlanmalıdır.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sync History */}
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <History className="size-4 text-muted-foreground" />
              <h3>Son Eşitleme İşlemleri</h3>
            </div>

            {history.length > 0 ? (
              <ul className="mt-3 max-h-64 divide-y divide-border/60 overflow-y-auto pr-1">
                {history.map((run) => (
                  <li key={run.id} className="py-2.5 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {run.kind === "units" ? "Tüm Birimler" : run.subjectId}
                        </span>
                        {run.status === "Failed" ? (
                          <Badge
                            variant="outline"
                            className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[10px]"
                          >
                            Başarısız
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px]"
                          >
                            Tamamlandı
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {run.requestedBy} · {new Date(run.completedAt).toLocaleString("tr-TR")}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {summary(run)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Henüz eşitleme işlemi çalıştırılmamış.
              </p>
            )}
          </div>
        </div>
      </details>
    </section>
  );
}
