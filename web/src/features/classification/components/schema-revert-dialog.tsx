"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
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
import { revertMetadataSchemaToDraftAction } from "@/features/classification/api/metadata-actions";

type SchemaRevertDialogProps = {
  schemaId: string;
  name: string;
  version: number;
  onReverted?: () => void;
};

export function SchemaRevertDialog({
  schemaId,
  name,
  version,
  onReverted,
}: SchemaRevertDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleRevert() {
    if (pending) return;
    setPending(true);
    setError("");

    const result = await revertMetadataSchemaToDraftAction(schemaId);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast.success(`"${name}" (v${version}) taslak durumuna geri alındı.`);
    setOpen(false);
    router.refresh();
    onReverted?.();
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => { setError(""); setOpen(true); }}
      >
        <RotateCcw className="size-4" aria-hidden />
        Taslağa Geri Al
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-5 text-amber-600" aria-hidden />
              Taslağa Geri Al
            </DialogTitle>
            <DialogDescription>
              Şemayı tekrar taslak durumuna getirerek köklü değişiklikler yapabilirsiniz.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-sm">
            <p>
              <strong className="font-semibold text-foreground">{name}</strong> (v{version}) şemasını taslağa geri almak üzeresiniz.
            </p>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="font-medium">Kurumsal Arşiv Denetimi:</p>
              <p className="mt-1">
                Eğer bu şema henüz hiçbir arşiv belgesine bağlanmadıysa doğrudan taslak durumuna döner ve serbestçe düzenlenebilir veya silinebilir.
                Halihazırda belgelere bağlanmışsa arşiv bütünlüğünü korumak adına yeni sürüm açmanız önerilir.
              </p>
            </div>

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
              variant="default"
              disabled={pending}
              onClick={handleRevert}
            >
              {pending ? "İşleniyor…" : "Taslağa Dönüştür"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

