"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { renameMetadataSchemaAction } from "@/features/classification/api/metadata-actions";

/** Şema adı yayımlandıktan sonra da düzeltilebilir; alanların aksine anlam taşımaz. */
export function SchemaRenameDialog({ schemaId, name, onChanged }: {
  schemaId: string; name: string;
  /** İsteğe bağlı; bileşen zaten yolu tazeler. */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  return <>
    <Button type="button" size="sm" variant="outline" onClick={() => { setValue(name); setError(""); setOpen(true); }}>
      <Pencil className="size-4" aria-hidden />Adı düzelt
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Şema adını düzelt</DialogTitle>
          <DialogDescription>Anahtar ve sürüm değişmez; yalnız görünen ad güncellenir.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={async event => {
          event.preventDefault();
          if (pending) return;
          setPending(true); setError("");
          const result = await renameMetadataSchemaAction(schemaId, value);
          setPending(false);
          if (result.error) { setError(result.error); return; }
          toast.success("Şema adı güncellendi.");
          setOpen(false);
          router.refresh();
    onChanged?.();
        }}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="schema-name">Şema adı</Label>
            <Input id="schema-name" value={value} required maxLength={300}
              onChange={event => setValue(event.target.value)} />
          </div>
          {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>İptal</DialogClose>
            <Button type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
