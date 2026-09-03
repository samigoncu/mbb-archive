import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Sayfa başlığı. Her ekran aynı hiyerarşiyi kullanır: başlık, açıklama ve
 * sağda birincil aksiyonlar. Başlıklar Lexend, açıklama gövde fontunda.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border pb-4">
      <div className="min-w-0">
        <h1 className="truncate">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Başlıklı içerik kutusu. Tablo ve listeler bunun içine yerleşir. */
export function Panel({
  title,
  description,
  actions,
  children,
  padded = false,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card shadow-flat",
        className,
      )}
    >
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn(padded && "p-4")}>{children}</div>
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {Icon ? <Icon className="size-7 text-muted-foreground/70" aria-hidden /> : null}
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Sayfa içi bilgilendirme; uyarı ya da kapsam notu için. */
export function Notice({
  icon: Icon,
  tone = "neutral",
  children,
}: {
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone?: "neutral" | "warning";
  children: ReactNode;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm leading-relaxed",
        tone === "warning"
          ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {Icon ? <Icon className="mt-0.5 size-4 shrink-0" aria-hidden /> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
