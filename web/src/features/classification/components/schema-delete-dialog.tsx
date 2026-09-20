"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteMetadataSchemaAction } from "@/features/classification/api/metadata-actions";

type SchemaDeleteDialogProps = {
  schemaId: string;
  name: string;
  version: number;
  fieldCount?: number;
  trigger?: React.ReactNode;
  onDeleted?: () => void;
};

export function SchemaDeleteDialog({
  schemaId,
  name,
  version,
  fieldCount = 0,
  trigger,
  onDeleted,
}: SchemaDeleteDialogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (pending) return;
    setPending(true);
    setError("");

    const result = await deleteMetadataSchemaAction(schemaId);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast.success(`"${name}" taslak şeması silindi.`);
    setOpen(false);

    // If currently viewing this deleted schema in URL, return to the base list
    const currentId = searchParams.get("id");
    if (currentId === schemaId) {
      router.push("/tanimlamalar/ustveri");
    }
    router.refresh();
    onDeleted?.();
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => { setError(""); setOpen(true); }}>
          {trigger}
        </span>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
          onClick={() => { setError(""); setOpen(true); }}
        >
          <Trash2 className="size-4" aria-hidden />
          Taslağı Sil
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Taslak Şemayı Sil</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz ve tanımlı tüm alanlar kalıcı olarak silinecektir.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-sm">
            <p className="text-foreground">
              <strong className="font-semibold text-foreground">{name}</strong> (v{version}) taslak şemasını
              {fieldCount > 0 && <span> ve içerdiği <strong>{fieldCount} adet alanı</strong></span>} silmek istediğinize emin misiniz?
            </p>
            <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
              Not: Yalnızca henüz yayımlanmamış taslak şemalar silinebilir. Belgelerle ilişkilendirilmiş üstveriler korunur.
            </p>
            {error && (
              <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>
              Vazgeç
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={handleDelete}
            >
              {pending ? "Siliniyor…" : "Şemayı Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

