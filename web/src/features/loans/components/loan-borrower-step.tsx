"use client";

import { Check, User, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LoanBorrower } from "../api/loan-selection-actions";
import { cn } from "@/lib/utils";

export function LoanBorrowerStep({
  borrower,
  borrowers,
  borrowerTotal,
  borrowerPage,
  borrowerQuery,
  searched,
  error,
  pending,
  onBorrowerQueryChange,
  onSearch,
  onSelectBorrower,
  onClearBorrower,
  onPageChange,
}: {
  borrower: LoanBorrower | null;
  borrowers: LoanBorrower[];
  borrowerTotal: number;
  borrowerPage: number;
  borrowerQuery: string;
  searched: boolean;
  error?: string;
  pending: boolean;
  onBorrowerQueryChange: (query: string) => void;
  onSearch: (page: number) => void;
  onSelectBorrower: (item: LoanBorrower) => void;
  onClearBorrower: () => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <fieldset disabled={pending} className="flex flex-1 flex-col min-h-0 space-y-3">
      <legend className="sr-only">2. Teslim alan personel seçimi</legend>

      <form
        className="flex items-end gap-2 shrink-0"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(1);
        }}
      >
        <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
          Kullanıcı kimliği veya birim
          <div className="relative mt-1">
            <User
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={borrowerQuery}
              maxLength={100}
              onChange={(event) => onBorrowerQueryChange(event.target.value)}
              placeholder="Personel kullanıcı adı ya da birim adı..."
              className="h-9.5 pl-9 rounded-xl text-xs bg-muted/20 border-border/70 focus-visible:ring-primary/20"
            />
            {borrowerQuery && (
              <button
                type="button"
                onClick={() => {
                  onBorrowerQueryChange("");
                  onSearch(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            )}
          </div>
        </label>
        <button
          type="submit"
          className="h-9.5 rounded-xl border border-border/80 bg-secondary px-4 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 shadow-xs transition-colors disabled:opacity-50"
        >
          Personel ara
        </button>
      </form>

      {borrower && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2 text-xs shrink-0 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
              <Check className="size-3" aria-hidden />
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Seçilen Personel:</span>
            <span className="font-semibold text-foreground">{borrower.subjectId}</span>
            <span className="text-muted-foreground truncate hidden sm:inline">
              ({borrower.unitName})
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearBorrower}
            className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
          >
            <X className="size-3 mr-1" aria-hidden />
            Seçimi Kaldır
          </Button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {borrowers.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Etkin personel">
            {borrowers.map((item) => {
              const isSelected = borrower?.subjectId === item.subjectId;
              return (
                <li key={item.subjectId}>
                  <button
                    type="button"
                    onClick={() => onSelectBorrower(item)}
                    aria-pressed={isSelected}
                    aria-label={`${item.subjectId} · ${item.unitName}`}
                    className={cn(
                      "group relative flex w-full items-center justify-between gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-150",
                      isSelected
                        ? "border-primary bg-primary/[0.05] ring-1.5 ring-primary shadow-xs"
                        : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/25 hover:shadow-xs",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                        )}
                      >
                        {item.subjectId.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                            {item.subjectId}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 shrink-0"
                          >
                            Etkin Personel
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {item.unitName}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 pl-1">
                      {isSelected ? (
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                          <Check className="size-3" aria-hidden />
                        </span>
                      ) : (
                        <span className="size-4 rounded-full border border-border group-hover:border-primary/50 block transition-colors" />
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : !searched ? (
          <div className="flex h-full min-h-[140px] items-center justify-center p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Personel aramak için yukarıdaki kutuya isim/birim yazıp &ldquo;Personel ara&rdquo; düğmesine basın.
            </p>
          </div>
        ) : !error ? (
          <div className="flex h-full min-h-[140px] items-center justify-center p-4 text-center">
            <p className="text-xs text-muted-foreground">
              Etkin birime kayıtlı personel bulunamadı. Birim üyeliklerini kontrol edin.
            </p>
          </div>
        ) : null}
      </div>

      {searched && (
        <nav
          aria-label="Personel seçim sayfaları"
          className="mt-auto flex items-center justify-between gap-3 border-t border-border/50 pt-2 shrink-0"
        >
          <button
            type="button"
            className="h-8 rounded-lg border border-border/80 px-3 text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
            disabled={borrowerPage <= 1}
            onClick={() => onPageChange(borrowerPage - 1)}
          >
            Önceki
          </button>
          <span className="text-xs text-muted-foreground font-medium">
            {borrowerTotal} kişi · Sayfa {borrowerPage}
          </span>
          <button
            type="button"
            className="h-8 rounded-lg border border-border/80 px-3 text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
            disabled={borrowerPage * 25 >= borrowerTotal}
            onClick={() => onPageChange(borrowerPage + 1)}
          >
            Sonraki
          </button>
        </nav>
      )}
    </fieldset>
  );
}
