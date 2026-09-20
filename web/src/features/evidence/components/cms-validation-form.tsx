"use client";

import { useActionState, useState } from "react";
import { FileSignature, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice, Panel } from "@/components/ui/page";
import {
  validateCmsSignatureAction,
  type CmsValidationState,
} from "@/features/evidence/api/validate-cms-action";
import {
  evidenceStatusLabels,
  evidenceStatusVariants,
} from "@/features/evidence/model/evidence";

const initialState: CmsValidationState = { status: "idle" };

/**
 * İmza ve varsa ayrık içerik tarayıcıda base64'e çevrilir; dosyanın kendisi
 * sunucuya yüklenmez, yalnızca doğrulama için iletilir ve saklanmaz.
 */
export function CmsValidationForm({ maxBytes }: { maxBytes: number }) {
  const [state, formAction, isPending] = useActionState(
    validateCmsSignatureAction,
    initialState,
  );

  const [signatureBase64, setSignatureBase64] = useState("");
  const [contentBase64, setContentBase64] = useState("");
  const [sizeError, setSizeError] = useState<string | null>(null);

  async function read(
    file: File | undefined,
    set: (value: string) => void,
  ): Promise<void> {
    if (!file) {
      set("");
      return;
    }

    if (file.size > maxBytes) {
      setSizeError(
        `${file.name} sınırı aşıyor (${formatBytes(file.size)} > ${formatBytes(maxBytes)}).`,
      );
      set("");
      return;
    }

    setSizeError(null);
    set(await toBase64(file));
  }

  return (
    <Panel
      title="CMS / e-imza doğrulama"
      description="PKCS#7 imza dosyası (.p7s) doğrudan doğrulanır."
      padded
    >
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="signatureBase64" value={signatureBase64} />
        <input
          type="hidden"
          name="detachedContentBase64"
          value={contentBase64}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="signature-file">İmza dosyası</Label>
            <Input
              id="signature-file"
              type="file"
              accept=".p7s,.p7m,.cms,.der,application/pkcs7-signature"
              onChange={(event) =>
                read(event.target.files?.[0], setSignatureBase64)
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="content-file">
              Ayrık içerik{" "}
              <span className="text-muted-foreground">(varsa)</span>
            </Label>
            <Input
              id="content-file"
              type="file"
              onChange={(event) =>
                read(event.target.files?.[0], setContentBase64)
              }
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="documentId">
            İlişkilendirilecek belge{" "}
            <span className="text-muted-foreground">(isteğe bağlı)</span>
          </Label>
          <Input
            id="documentId"
            name="documentId"
            placeholder="01a06f69-…"
            className="font-mono text-xs"
          />
        </div>

        {sizeError ? <Notice tone="warning">{sizeError}</Notice> : null}

        <div>
          <Button type="submit" disabled={isPending || !signatureBase64}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FileSignature className="size-4" aria-hidden />
            )}
            {isPending ? "Doğrulanıyor…" : "İmzayı Doğrula"}
          </Button>
        </div>

        {state.status === "error" ? (
          <Notice tone="warning">{state.message}</Notice>
        ) : null}

        {state.result ? <ValidationResult result={state.result} /> : null}
      </form>
    </Panel>
  );
}

function ValidationResult({
  result,
}: {
  result: NonNullable<CmsValidationState["result"]>;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={evidenceStatusVariants[result.status] ?? "secondary"}>
          {evidenceStatusLabels[result.status] ?? result.status}
        </Badge>
        <span className="text-xs text-muted-foreground">{result.provider}</span>
      </div>

      <p className="break-all font-mono text-[10px] text-muted-foreground">
        içerik özeti: {result.contentSha256}
      </p>

      <details>
        <summary className="cursor-pointer text-xs text-muted-foreground">
          Doğrulama raporu
        </summary>
        <pre className="mt-2 max-h-72 overflow-auto rounded bg-background p-2 text-[10px] leading-relaxed">
          {formatReport(result.reportJson)}
        </pre>
      </details>
    </div>
  );
}

function formatReport(reportJson: string): string {
  try {
    return JSON.stringify(JSON.parse(reportJson), null, 2);
  } catch {
    return reportJson;
  }
}

async function toBase64(file: File): Promise<string> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";

  // Büyük dosyalarda tek seferde spread etmek yığın taşırır; parça parça çevrilir.
  const chunkSize = 0x8000;

  for (let offset = 0; offset < buffer.length; offset += chunkSize) {
    binary += String.fromCharCode(...buffer.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
