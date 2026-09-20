"use server";
import { revalidatePath } from "next/cache";
import { apiPost, ApiError } from "@/lib/api/api-client";
import { getCurrentUser } from "@/features/access/api/get-current-user";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";
export async function operationsAction(_: ActionState, data: FormData): Promise<ActionState> {
  const value = (name: string) => String(data.get(name) ?? "").trim();
  const operation = value("operation");
  const permission = operation.startsWith("dr-") ? "operations.dr.manage" : operation === "acknowledge" ? "operations.alerts.acknowledge" : "operations.alerts.manage";
  const user = await getCurrentUser();
  if (!user?.isAuthenticated || (!user.isBootstrapAdministrator && !user.permissions.includes(permission)))
    return { status: "error", message: "Bu işlem için yetkiniz yok." };
  const id = encodeURIComponent(value("id"));
  try {
    switch (operation) {
      case "evaluate": {
        const result = await apiPost<unknown, { opened: number; resolved: number; missingMetrics: string[] }>("/operations/alerts/evaluate", {});
        revalidatePath("/operations");
        return { status: "success", message: `${result.opened} alarm açıldı, ${result.resolved} alarm kapandı.${result.missingMetrics.length ? ` Ölçüm alınamadı: ${result.missingMetrics.join(", ")}.` : ""}` };
      }
      case "create-rule":
        await apiPost("/operations/alert-rules", { code: value("code"), metric: value("metric"), comparison: Number(value("comparison")),
          threshold: Number(value("threshold")), severity: Number(value("severity")), evaluationWindowMinutes: Number(value("window")),
          notificationChannel: value("channel") ? Number(value("channel")) : null, notificationTarget: value("target") || null }); break;
      case "rule-enabled": await apiPost(`/operations/alert-rules/${id}/enabled`, { enabled: value("enabled") === "true" }); break;
      case "acknowledge": await apiPost(`/operations/alerts/${id}/acknowledge`, { note: value("note") }); break;
      case "resolve": await apiPost(`/operations/alerts/${id}/resolve`, {}); break;
      case "retry": await apiPost(`/operations/notifications/${id}/retry`, {}); break;
      case "dr-plan": await apiPost("/operations/recovery-drills", { backupReference: value("backup"), targetEnvironment: value("environment"), targetRpoMinutes: Number(value("rpo")), targetRtoMinutes: Number(value("rto")) }); break;
      case "dr-start": await apiPost(`/operations/recovery-drills/${id}/start`, {}); break;
      case "dr-complete":
        if (!value("evidence") || !value("notes")) return { status: "error", message: "Kanıt referansı ve doğrulama açıklaması zorunludur." };
        await apiPost(`/operations/recovery-drills/${id}/complete`, { passed: value("passed") === "true", actualRpoMinutes: Number(value("rpo")), actualRtoMinutes: Number(value("rto")), evidenceReference: value("evidence"), notes: value("notes") }); break;
      default: return { status: "error", message: "Bilinmeyen operasyon işlemi." };
    }
    revalidatePath("/operations"); return { status: "success", message: "İşlem kaydedildi." };
  } catch (error) { return { status: "error", message: error instanceof ApiError ? error.message : "İşlem tamamlanamadı; tekrar deneyin." }; }
}
