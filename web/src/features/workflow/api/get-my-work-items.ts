import { ApiError, apiGet } from "@/lib/api/api-client";
import type { WorkflowWorkItem } from "@/features/workflow/model/workflow";

export type MyWorkItemsResult = {
  items: WorkflowWorkItem[];
  /** Yetki eksikliği ile "görev yok" farklı durumlardır; ekran ayırt eder. */
  error: string | null;
};

export async function getMyWorkItems(take = 100, status = "all"): Promise<MyWorkItemsResult> {
  try {
    const items = await apiGet<WorkflowWorkItem[]>(
      `/workflows/work-items/mine?take=${take}&status=${encodeURIComponent(status)}`,
      { cache: "no-store" },
    );

    return { items, error: null };
  } catch (error) {
    if (error instanceof ApiError) {
      return {
        items: [],
        error:
          error.status === 403
            ? "Görev listesini görmek için workflow.read izni gerekiyor."
            : `İş akışı servisi yanıt vermedi (${error.status}).`,
      };
    }

    return { items: [], error: "İş akışı servisine ulaşılamadı." };
  }
}
