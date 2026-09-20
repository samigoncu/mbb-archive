import React from "react";
import { CheckCircle2, Clock, AlertTriangle, FileX, Loader2, Sparkles } from "lucide-react";
import {
  type ProcessingItem,
  type ProcessingProgress,
  getProcessingProgress,
  PIPELINE_STEPS,
} from "../model";

interface ProcessingProgressBarProps {
  job: ProcessingItem;
  showSteps?: boolean;
  className?: string;
}

export function ProcessingProgressBar({
  job,
  showSteps = true,
  className = "",
}: ProcessingProgressBarProps) {
  const progress: ProcessingProgress = getProcessingProgress(job);

  const getTrackColor = () => {
    switch (progress.variant) {
      case "completed":
        return "bg-emerald-500 dark:bg-emerald-400";
      case "failed":
        return "bg-rose-500 dark:bg-rose-400";
      case "queued":
        return "bg-amber-500 dark:bg-amber-400";
      case "unsupported":
        return "bg-zinc-400 dark:bg-zinc-600";
      default:
        return "bg-sky-500 dark:bg-sky-400";
    }
  };

  const getBadgeStyles = () => {
    switch (progress.variant) {
      case "completed":
        return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
      case "failed":
        return "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
      case "queued":
        return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
      case "unsupported":
        return "border-border bg-muted text-muted-foreground";
      default:
        return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300";
    }
  };

  const renderIcon = () => {
    switch (progress.variant) {
      case "completed":
        return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
      case "failed":
        return <AlertTriangle className="size-3.5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />;
      case "queued":
        return <Clock className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
      case "unsupported":
        return <FileX className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />;
      default:
        return <Loader2 className="size-3.5 shrink-0 animate-spin text-sky-600 dark:text-sky-400" aria-hidden="true" />;
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Üst İlerleme ve % Dilimi Başlığı */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold tabular-nums shadow-xs ${getBadgeStyles()}`}
          >
            {renderIcon()}
            <span>%{progress.percentage}</span>
            <span className="text-[11px] font-normal opacity-90">· {progress.stageName}</span>
          </span>
          <span className="hidden text-muted-foreground sm:inline">
            {progress.statusText}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <span>İşlem Dilimi:</span>
          <span className="font-bold tabular-nums text-foreground">%{progress.percentage}</span>
        </div>
      </div>

      {/* İlerleme Çubuğu */}
      <div
        role="progressbar"
        aria-valuenow={progress.percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${progress.stageName} aşaması, %${progress.percentage} tamamlandı`}
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted/80 shadow-inner"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getTrackColor()}`}
          style={{ width: `${Math.max(progress.percentage, 0)}%` }}
        />
      </div>

      {/* 5-Adımlı Süreç Çizelgesi */}
      {showSteps && (
        <div className="grid grid-cols-5 gap-1 pt-0.5 text-[11px]">
          {PIPELINE_STEPS.map((step) => {
            const isCompleted = progress.percentage >= step.percent;
            const isCurrent =
              progress.stepIndex === step.step ||
              (!progress.isComplete && !progress.isFailed && progress.percentage >= step.percent - 15 && progress.percentage < step.percent + 15);

            return (
              <div
                key={step.step}
                className={`flex flex-col items-center text-center transition-colors ${
                  isCurrent
                    ? "font-semibold text-primary"
                    : isCompleted
                    ? "text-foreground"
                    : "text-muted-foreground/60"
                }`}
              >
                <div className="mb-1 flex items-center justify-center">
                  {isCompleted ? (
                    <span className="flex size-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                    </span>
                  ) : isCurrent ? (
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary/20 text-primary animate-pulse">
                      <span className="size-1.5 rounded-full bg-primary" />
                    </span>
                  ) : (
                    <span className="flex size-4 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <span className="size-1 rounded-full bg-muted-foreground/40" />
                    </span>
                  )}
                </div>
                <span className="truncate max-w-[80px] leading-tight text-[10px] sm:text-[11px]">
                  {step.name}
                </span>
                <span className="text-[9px] text-muted-foreground/70 tabular-nums">
                  %{step.percent}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

