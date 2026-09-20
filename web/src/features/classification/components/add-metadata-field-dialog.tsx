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
import { addMetadataFieldAction } from "@/features/classification/api/metadata-actions";
import { metadataFieldTypeLabels as fieldTypeLabels } from "@/features/classification/model/classification";

const choiceTypes = new Set(["Choice", "MultiChoice"]);

type AddMetadataFieldDialogProps = {
  schemaId: string;
  schemaName: string;
  trigger?: React.ReactElement;
  onAdded?: () => void;
};

export function AddMetadataFieldDialog({
  schemaId,
  schemaName,
  trigger,
  onAdded,
}: AddMetadataFieldDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("Text");
  const [optionsJson, setOptionsJson] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [isSearchable, setIsSearchable] = useState(true);
  const [isRepeatable, setIsRepeatable] = useState(false);

  function resetForm() {
    setKey("");
    setLabel("");
    setFieldType("Text");
    setOptionsJson("");
    setIsRequired(false);
    setIsSearchable(true);
    setIsRepeatable(false);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim() || !label.trim()) {
      setError("Lütfen alan anahtarı ve görünen ad alanlarını doldurun.");
      return;
    }

    if (choiceTypes.has(fieldType) && optionsJson.trim()) {
      try {
        const parsed = JSON.parse(optionsJson.trim());
        if (!Array.isArray(parsed)) {
          setError("Seçenekler geçerli bir JSON dizisi olmalıdır (örn: [\"Seçenek 1\", \"Seçenek 2\"]).");
          return;
        }
      } catch {
        setError("Seçenekler geçerli bir JSON dizisi formatında değil.");
        return;
      }
    }

    setPending(true);
    setError("");

    const result = await addMetadataFieldAction(schemaId, {
      key: key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      label: label.trim(),
      fieldType,
      isRequired,
      isSearchable,
      isRepeatable,
      optionsJson: choiceTypes.has(fieldType) ? optionsJson.trim() || null : null,
    });

    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast.success(`"${label}" alanı başarıyla eklendi.`);
    setOpen(false);
    resetForm();
    router.refresh();
    onAdded?.();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger render={
        trigger ?? (
          <Button size="sm" className="gap-1.5 font-medium">
            <Plus className="size-4" aria-hidden />
            Alan Ekle
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Üstveri Alanı Ekle</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">{schemaName}</span> taslak şemasına yeni bir üstveri alanı tanımlayın.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-field-key">Alan Anahtarı</Label>
              <Input
                id="new-field-key"
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                placeholder="ruhsat_no"
                required
                maxLength={100}
                className="font-mono text-sm"
              />
              <span className="text-[11px] text-muted-foreground">
                Değerler bu anahtarla saklanır; değiştirilemez.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-field-label">Görünen Ad</Label>
              <Input
                id="new-field-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ruhsat Numarası"
                required
                maxLength={300}
              />
              <span className="text-[11px] text-muted-foreground">
                Kullanıcıların arayüzde göreceği etiket.
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-field-type">Veri Türü</Label>
            <select
              id="new-field-type"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {Object.entries(fieldTypeLabels).map(([val, text]) => (
                <option key={val} value={val}>
                  {text}
                </option>
              ))}
            </select>
          </div>

          {choiceTypes.has(fieldType) && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-field-options">Seçenekler Listesi (JSON Formatında)</Label>
              <Input
                id="new-field-options"
                value={optionsJson}
                onChange={(e) => setOptionsJson(e.target.value)}
                placeholder='["Seçenek 1", "Seçenek 2", "Seçenek 3"]'
                className="font-mono text-xs"
              />
              <span className="text-[11px] text-muted-foreground">
                Kullanıcının seçebileceği seçenekleri JSON dizisi olarak girin.
              </span>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Zorunlu Alan
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                checked={isSearchable}
                onChange={(e) => setIsSearchable(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Aramada Kullanılsın
            </label>

            <label className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-xs font-medium cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                checked={isRepeatable}
                onChange={(e) => setIsRepeatable(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Çok Değerli
            </label>
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
              {pending ? "Ekleniyor…" : "Alanı Ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
