import { apiGet, ApiError } from "@/lib/api/api-client";
import type { AuditEvent } from "@/features/audit/model/audit";

export type AuditEventFilter = {
  activity?: string;
  eventName?: string;
  documentId?: string;
  actor?: string;
  from?: string;
  to?: string;
  before?: string;
  take?: number;
};

/**
 * Denetim izi `permission:audit.read` ister. Yetki yoksa ya da servis kapalıysa
 * boş liste döner; çağıran taraf bloğu gizler, örnek veri üretilmez.
 */
export async function getAuditEvents(take = 20): Promise<AuditEvent[]> {
  const result = await queryAuditEvents({ take });
  return result.events;
}

export type AuditEventQueryResult = {
  events: AuditEvent[];
  /** Sorgu başarısızsa hatanın nedeni; ekran boş liste ile sessiz kalmaz. */
  error: string | null;
};

/**
 * Denetim ekranı hatayı gizleyemez: yetkisizlik ile "hiç kayıt yok" farklı
 * durumlardır ve bir denetim ekranında karıştırılmamalıdır.
 */
export async function queryAuditEvents(
  filter: AuditEventFilter = {},
): Promise<AuditEventQueryResult> {
  const params = new URLSearchParams();
  params.set("take", String(filter.take ?? 100));

  if (filter.eventName) {
    params.set("eventName", filter.eventName);
  }

  if (filter.documentId) {
    params.set("documentId", filter.documentId);
  }

  for (const key of ["actor", "from", "to", "before", "activity"] as const) {
    if (filter[key]) params.set(key, filter[key]);
  }

  try {
    const events = await apiGet<AuditEvent[]>(`/audit/events?${params}`, {
      cache: "no-store",
    });

    return { events, error: null };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        events: [],
        error:
          error.status === 403
            ? "Denetim kayıtlarını görmek için audit.read izni gerekiyor."
            : `Denetim servisi yanıt vermedi (${error.status}).`,
      };
    }

    return { events: [], error: "Denetim servisine ulaşılamadı." };
  }
}
