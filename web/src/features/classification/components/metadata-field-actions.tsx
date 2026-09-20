"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  removeMetadataFieldAction,
  updateMetadataFieldAction,
  type MetadataActionResult,
} from "@/features/classification/api/metadata-actions";
import { cn } from "@/lib/utils";
import { metadataFieldTypeLabels as fieldTypeLabels, type MetadataFieldDefinition } from "@/features/classification/model/classification";

const choiceTypes = new Set(["Choice", "MultiChoice"]);

export function MetadataFieldActions({ schemaId, field, isDraft = true, onChanged }: {
  schemaId: string;
  field: MetadataFieldDefinition;
  isDraft?: boolean;
  /** İsteğe bağlı; bileşen zaten yolu tazeler. */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    label: field.label,
    fieldType: field.fieldType as string,
    isRequired: field.isRequired,
    isSearchable: field.isSearchable,
    isRepeatable: field.isRepeatable,
    optionsJson: field.optionsJson ?? "",
  });

  async function run(key: string, work: () => Promise<MetadataActionResult>, success: string, close: () => void) {
    if (pending) return;
    setPending(key); setError("");
    const result = await work();
    setPending("");
    if (result.error) { setError(result.error); return; }
    toast.success(success);
    close();
    router.refresh();
    onChanged?.();
  }

  return <>
    <span className="flex items-center gap-1">
      <Button type="button" size="icon-sm" variant="ghost" aria-label={`${field.label} alanını düzenle`}
        onClick={() => { setError(""); setEditing(true); }}>
        <Pencil className="size-4" aria-hidden />
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" aria-label={`${field.label} alanını kaldır`}
        onClick={() => { setError(""); setRemoving(true); }}>
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </span>

    <Dialog open={editing} onOpenChange={setEditing}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Alanı düzenle</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{field.key}</span> · Alan anahtarı değiştirilemez;
            kaydedilmiş üstveri değerleri bu anahtarla saklanır.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={event => {
          event.preventDefault();
          void run("edit", () => updateMetadataFieldAction(schemaId, field.id, {
            ...form, optionsJson: choiceTypes.has(form.fieldType) ? form.optionsJson : null,
          }), "Alan güncellendi.", () => setEditing(false));
        }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="field-label">Görünen ad</Label>
              <Input id="field-label" value={form.label} required maxLength={300}
                onChange={event => setForm({ ...form, label: event.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="field-type">Alan türü</Label>
              <select id="field-type" value={form.fieldType}
                disabled={!isDraft}
                onChange={event => setForm({ ...form, fieldType: event.target.value })}
                className={cn("h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm", !isDraft && "opacity-60 cursor-not-allowed")}>
                {Object.entries(fieldTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              {!isDraft && <span className="text-[11px] text-muted-foreground">Yayımlanmış şemada veri türü kilitlidir; değiştirmek için yeni sürüm açınız.</span>}
            </div>
          </div>

          {choiceTypes.has(form.fieldType) && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="field-options">Seçenekler</Label>
              <Input id="field-options" value={form.optionsJson} placeholder='["Seçenek 1", "Seçenek 2"]'
                className="font-mono text-xs"
                onChange={event => setForm({ ...form, optionsJson: event.target.value })} />
              <span className="text-xs text-muted-foreground">JSON dizisi. Bozuk yazılırsa alan seçeneksiz kalır.</span>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-3">
            {([
              ["isRequired", "Zorunlu"],
              ["isSearchable", "Aranabilir"],
              ["isRepeatable", "Çok değerli"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-sm">
                <input type="checkbox" checked={form[key]} className="size-4"
                  onChange={event => setForm({ ...form, [key]: event.target.checked })} />
                {label}
              </label>
            ))}
          </div>

          {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>İptal</DialogClose>
            <Button type="submit" disabled={!!pending}>{pending === "edit" ? "Kaydediliyor…" : "Kaydet"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={removing} onOpenChange={setRemoving}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{field.label} alanını kaldır</DialogTitle>
          <DialogDescription><span className="font-mono">{field.key}</span> · {fieldTypeLabels[field.fieldType] ?? field.fieldType}</DialogDescription>
        </DialogHeader>
        <p className="text-xs leading-5 text-muted-foreground">
          Alan yalnız taslak şemadan kaldırılabilir. Yayımlanmış şemada değişiklik için
          aynı anahtarla yeni bir sürüm oluşturun.
        </p>
        {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Vazgeç</DialogClose>
          <Button type="button" variant="destructive" disabled={!!pending}
            onClick={() => void run("remove", () => removeMetadataFieldAction(schemaId, field.id),
              "Alan kaldırıldı.", () => setRemoving(false))}>
            {pending === "remove" ? "Kaldırılıyor…" : "Alanı kaldır"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
