"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";
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
import { publishMetadataSchemaAction } from "@/features/classification/api/metadata-actions";

type SchemaPublishDialogProps = {
  schemaId: string;
  name: string;
  version: number;
  fieldCount: number;
  onPublished?: () => void;
};

export function SchemaPublishDialog({
  schemaId,
  name,
  version,
  fieldCount,
  onPublished,
}: SchemaPublishDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const canPublish = fieldCount > 0;

  async function handlePublish() {
    if (pending || !canPublish) return;
    setPending(true);
    setError("");

    const result = await publishMetadataSchemaAction(schemaId);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast.success(`"${name}" (v${version}) başarıyla yayımlandı.`);
    setOpen(false);
    router.refresh();
    onPublished?.();
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
        onClick={() => { setError(""); setOpen(true); }}
      >
        <CheckCircle2 className="size-4" aria-hidden />
        Şemayı Yayımla
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="size-5 text-emerald-600" aria-hidden />
              Üstveri Şemasını Yayımla
            </DialogTitle>
            <DialogDescription>
              Yayımlanan şema doğrudan arşiv sistemindeki belgelerin üstveri girişinde kullanılmaya başlar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-sm">
            <p>
              <strong className="font-semibold">{name}</strong> (v{version}) şemasını {fieldCount} alan ile yayımlamak üzeresiniz.
            </p>

            {!canPublish ? (
              <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                Şemayı yayımlamadan önce en az bir üstveri alanı tanımlamalısınız.
              </p>
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-medium">Önemli Hatırlatma:</p>
                <p className="mt-1">
                  Yayımlandıktan sonra bu şemanın alanları dondurulur (eklenemez, değiştirilemez veya kaldırılamaz).
                  Değişiklik gerektiğinde aynı anahtarla yeni bir sürüm açmanız gerekir.
                </p>
              </div>
            )}

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
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={pending || !canPublish}
              onClick={handlePublish}
            >
              {pending ? "Yayımlanıyor…" : "Yayımla ve Kilitle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

