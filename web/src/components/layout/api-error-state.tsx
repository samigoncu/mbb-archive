"use client";

import { ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * API'ye ulaşılamadığında gösterilir. Bilinçli olarak örnek veriye düşülmez;
 * kullanıcının hatayı gerçek arşiv verisi sanması engellenir.
 */
export function ApiErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-card p-12 text-center">
      <ServerCrash className="mx-auto size-8 text-destructive" aria-hidden />
      <h2 className="mt-3 text-base font-semibold">Veriye ulaşılamadı</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Arşiv servisi şu anda yanıt vermiyor. Bu ekranda veri gösterilmiyor —
        aşağıdan tekrar deneyebilirsiniz.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          hata kodu: {error.digest}
        </p>
      ) : null}
      <Button onClick={reset} variant="outline" className="mt-4">
        Tekrar dene
      </Button>
    </div>
  );
}
