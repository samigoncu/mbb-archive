"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { OfficePreview } from "./office-preview";

/** Uses the same authenticated, version-specific content routes as the detail preview. */
export function DocumentFullscreen({ documentId, title, version, contentUrl, kind }: {
  documentId: string;
  title: string;
  version: number;
  contentUrl: string;
  kind: "pdf" | "image" | "office";
}) {
  const heading = `${title} — v${version}`;
  return <Dialog>
    <DialogTrigger render={<Button type="button" variant="outline" className="h-9" />}>
      <Maximize2 aria-hidden className="size-4" />Tam ekran
    </DialogTrigger>
    <DialogContent showCloseButton={false} className="inset-0 top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-none">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-background px-4 py-3">
        <DialogTitle className="min-w-0 truncate text-sm font-semibold">{heading}</DialogTitle>
        <DialogClose render={<Button type="button" variant="outline" className="shrink-0" />}>
          <Minimize2 aria-hidden className="size-4" />Tam ekrandan çık
        </DialogClose>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100 p-2 dark:bg-slate-900">
        {kind === "pdf" ? <iframe src={contentUrl} title={`${heading} — tam ekran`} className="h-full w-full border-0 bg-white" />
          : kind === "office" ? <OfficePreview documentId={documentId} title={heading} versionNumber={version} fill />
          : <img src={contentUrl} alt={heading} className="max-h-full max-w-full object-contain" />}
      </div>
    </DialogContent>
  </Dialog>;
}
