"use client";

import { useState } from "react";
import { Download, ExternalLink, FileWarning, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const previewable = new Set(["application/pdf", "image/png", "image/jpeg"]);

/**
 * Belge önizlemesi. PDF ve görseller tarayıcının kendi görüntüleyicisiyle
 * gösterilir (zoom, sayfa gezinme, tam ekran onun içinde gelir). Sayfa küçük
 * resimleri için ayrı bir render pipeline gerekiyor; henüz yok.
 */
export function DocumentViewer({
  contentUrl,
  downloadUrl,
  mimeType,
  hasContent,
}: {
  contentUrl: string;
  downloadUrl: string;
  mimeType: string | null;
  hasContent: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!hasContent) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <FileWarning className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Bu belgenin yüklenmiş dosyası yok</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Belge kaydı oluşturulmuş ancak henüz bir dosya yüklenip güvenlik
          taramasından geçirilmemiş.
        </p>
      </div>
    );
  }

  const canEmbed = mimeType !== null && previewable.has(mimeType);

  return (
    <section
      aria-label="Belge önizleme"
      className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-flat"
    >
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
          {mimeType ?? "bilinmeyen tür"}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded((value) => !value)}
            aria-pressed={isExpanded}
          >
            <Maximize2 className="size-3.5" aria-hidden />
            {isExpanded ? "Küçült" : "Büyüt"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<a href={contentUrl} target="_blank" rel="noreferrer" />}
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Yeni sekme
          </Button>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<a href={downloadUrl} />}
          >
            <Download className="size-3.5" aria-hidden />
            İndir
          </Button>
        </div>
      </header>

      {canEmbed ? (
        <iframe
          src={contentUrl}
          title="Belge önizleme"
          className={isExpanded ? "h-[calc(100vh-12rem)] w-full" : "h-[36rem] w-full"}
        />
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-12 text-center">
          <p className="text-sm font-medium">Bu tür tarayıcıda önizlenemiyor</p>
          <p className="text-sm text-muted-foreground">
            Dosyayı indirerek görüntüleyebilirsiniz.
          </p>
        </div>
      )}
    </section>
  );
}
