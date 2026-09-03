import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type StatTone = "neutral" | "danger" | "warning" | "success";

const valueTone: Record<StatTone, string> = {
  neutral: "text-foreground",
  danger: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  success: "text-emerald-700 dark:text-emerald-400",
};

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: number | null;
  hint: string;
  icon: LucideIcon;
  tone?: StatTone;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <p
        className={cn(
          "mt-2 font-heading text-2xl font-semibold tabular-nums",
          value === null ? "text-muted-foreground" : valueTone[tone],
        )}
      >
        {value === null ? "—" : value.toLocaleString("tr-TR")}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {value === null ? "Ölçüm gelmedi" : hint}
      </p>
    </>
  );

  const className =
    "block rounded-lg border border-border bg-card p-4 shadow-flat transition-colors";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          className,
          "hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}
