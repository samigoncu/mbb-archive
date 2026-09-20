"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProcessingRefreshProps {
  hasActiveJobs?: boolean;
}

export function ProcessingRefresh({ hasActiveJobs = false }: ProcessingRefreshProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [intervalSec, setIntervalSec] = useState<number>(hasActiveJobs ? 4 : 5);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const refreshData = useCallback(() => {
    start(() => {
      router.refresh();
      setLastUpdated(new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    });
  }, [router]);

  // Sayfa yüklendiğinde ve pencereye her odaklanıldığında anında güncelle
  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

    const onFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        refreshData();
      }
    };

    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);

    return () => {
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [refreshData]);

  // Periyodik canlı sorgulama (polling)
  useEffect(() => {
    if (intervalSec <= 0) return;

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshData();
      }
    }, intervalSec * 1000);

    return () => clearInterval(timer);
  }, [intervalSec, refreshData]);

  // Aktif bekleyen iş varsa otomatik olarak 4 saniyeye al
  useEffect(() => {
    if (hasActiveJobs && intervalSec > 4) {
      setIntervalSec(4);
    }
  }, [hasActiveJobs, intervalSec]);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2.5 text-xs text-muted-foreground">
      {/* Canlı Akış Durumu */}
      <div className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
        {intervalSec > 0 ? (
          <>
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-medium text-foreground">Canlı Akış</span>
            <span className="text-muted-foreground">({intervalSec}s)</span>
          </>
        ) : (
          <>
            <span className="size-2 rounded-full bg-zinc-400" />
            <span className="text-muted-foreground">Otomatik yenileme kapalı</span>
          </>
        )}
      </div>

      {/* Yenileme Sıklığı Seçimi */}
      <div className="hidden items-center rounded-lg border border-border bg-muted/40 p-0.5 sm:flex" role="group" aria-label="Yenileme sıklığı">
        <button
          type="button"
          onClick={() => setIntervalSec(4)}
          className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
            intervalSec === 4
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Her 4 saniyede bir otomatik yenile (Hızlı)"
        >
          4s
        </button>
        <button
          type="button"
          onClick={() => setIntervalSec(10)}
          className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
            intervalSec === 10
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Her 10 saniyede bir otomatik yenile (Normal)"
        >
          10s
        </button>
        <button
          type="button"
          onClick={() => setIntervalSec(0)}
          className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
            intervalSec === 0
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Otomatik yenilemeyi duraklat, yalnız butona basıldığında yenile"
        >
          Durdur
        </button>
      </div>

      {/* Son Güncelleme Zamanı */}
      {lastUpdated && (
        <span className="hidden tabular-nums md:inline">
          {lastUpdated}
        </span>
      )}

      {/* Manuel Yenile Butonu */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={refreshData}
        className="h-8 gap-1.5 px-3"
        aria-label="İşlem listesini şimdi yenile"
      >
        <RefreshCw className={`size-3.5 ${pending ? "animate-spin text-primary" : ""}`} aria-hidden="true" />
        <span>{pending ? "Yenileniyor…" : "Şimdi Yenile"}</span>
      </Button>
    </div>
  );
}
