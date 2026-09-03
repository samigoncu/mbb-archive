import { CheckCircle2, Clock, FileStack, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SummaryTone = "neutral" | "danger" | "warning" | "success";

const toneClasses: Record<SummaryTone, string> = {
  neutral: "text-muted-foreground",
  danger: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-700 dark:text-emerald-400",
};

export function LoanSummary({
  active,
  overdue,
  dueSoon,
  returned,
}: {
  active: number;
  overdue: number;
  dueSoon: number;
  returned: number;
}) {
  const cards: Array<{
    label: string;
    value: number;
    hint: string;
    icon: LucideIcon;
    tone: SummaryTone;
  }> = [
    { label: "Aktif Zimmet", value: active, hint: "Birimlerde dolaşımda", icon: FileStack, tone: "neutral" },
    { label: "Süresi Geçen", value: overdue, hint: "İade ihtarı gerekiyor", icon: TriangleAlert, tone: "danger" },
    { label: "İadesi Yaklaşan", value: dueSoon, hint: "7 gün içinde", icon: Clock, tone: "warning" },
    { label: "İade Alınan", value: returned, hint: "Rafa kaldırıldı", icon: CheckCircle2, tone: "success" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div key={card.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
              <Icon className={cn("size-4 shrink-0", toneClasses[card.tone])} aria-hidden />
            </div>
            <p className={cn("mt-2 text-2xl font-semibold tabular-nums", toneClasses[card.tone])}>
              {card.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.hint}</p>
          </div>
        );
      })}
    </div>
  );
}
