"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMetadataSchemaAction } from "@/features/classification/api/metadata-actions";

type CreateSchemaDialogProps = {
  trigger?: React.ReactElement;
  onCreated?: (schemaId: string) => void;
};

export function CreateSchemaDialog({ trigger, onCreated }: CreateSchemaDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [version, setVersion] = useState(1);

  function resetForm() {
    setKey("");
    setName("");
    setVersion(1);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim() || !name.trim()) {
      setError("Lütfen anahtar ve şema adı alanlarını eksiksiz doldurun.");
      return;
    }

    setPending(true);
    setError("");

    const result = await createMetadataSchemaAction({
      key: key.trim().toLowerCase(),
      name: name.trim(),
      version: Number(version),
    });

    setPending(false);

    if (result.error || !result.id) {
      setError(result.error || "Şema oluşturulamadı.");
      return;
    }

    toast.success("Üstveri şeması oluşturuldu.");
    setOpen(false);
    resetForm();

    router.push(`/tanimlamalar/ustveri?id=${result.id}`);
    router.refresh();
    onCreated?.(result.id);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger render={
        trigger ?? (
          <Button size="sm" className="gap-1.5 font-medium">
            <Plus className="size-4" aria-hidden />
            Yeni Şema
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Üstveri Şeması</DialogTitle>
          <DialogDescription>
            Belgelerde toplanacak özel üstverileri gruplayan yeni bir şema taslağı tanımlayın.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-schema-key">Şema Anahtarı (Slug)</Label>
            <Input
              id="create-schema-key"
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))}
              placeholder="Örn: imar-ruhsat, sozlesme-ustveri"
              required
              maxLength={100}
              className="font-mono text-sm"
            />
            <span className="text-xs text-muted-foreground">
              Sürümler bu anahtarla eşleşir ve sonradan değiştirilemez.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-schema-name">Şema Adı</Label>
            <Input
              id="create-schema-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: İmar Ruhsatı Üstverisi"
              required
              maxLength={300}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="create-schema-version">Sürüm Numarası</Label>
            <Input
              id="create-schema-version"
              type="number"
              min={1}
              value={version}
              onChange={(e) => setVersion(Math.max(1, parseInt(e.target.value, 10) || 1))}
              required
            />
            <span className="text-xs text-muted-foreground">
              İlk sürüm için genellikle 1 kullanılır.
            </span>
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
              {error}
            </p>
          )}

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <DialogClose render={<Button type="button" variant="outline" disabled={pending} />}>
              İptal
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Oluşturuluyor…" : "Şemayı Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
