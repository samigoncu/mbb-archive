"use client";

import { useActionState, useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadDocumentAction } from "@/features/scanning/api/upload-actions";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

const initialState: ActionState = { status: "idle" };

export function UploadPanel() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(uploadDocumentAction, initialState);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      formRef.current?.reset();
    }

    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-flat"
    >
      <div>
        <h2 className="text-sm font-semibold">Belge Yükle</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          PDF veya taranmış görsel yükleyin. Dosya güvenlik taramasından geçtikten
          sonra arşive alınır, OCR uygulanır ve aramaya indekslenir.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="upload-title">Belge Başlığı</Label>
        <Input
          id="upload-title"
          name="title"
          placeholder="Boş bırakılırsa dosya adı kullanılır"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="upload-file">Dosya</Label>
        <Input
          id="upload-file"
          name="file"
          type="file"
          required
          accept="application/pdf,image/tiff,image/jpeg,image/png"
          className="file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-sm"
        />
      </div>

      {state.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-fit">
        <Upload className="size-4" aria-hidden />
        {pending ? "Yükleniyor…" : "Yükle ve İşleme Al"}
      </Button>
    </form>
  );
}
