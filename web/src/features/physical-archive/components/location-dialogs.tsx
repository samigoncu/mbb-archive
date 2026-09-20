"use client";

import { useActionState, useEffect, useState } from "react";
import { FolderPlus, Pencil, Plus, Power, Trash2 } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createLocationAction,
  deleteLocationAction,
  setLocationActiveAction,
  updateLocationAction,
  type LocationActionState,
} from "@/features/physical-archive/api/location-actions";
import type { LocationOccupancyItem } from "@/features/physical-archive/api/get-occupancy";
import {
  acceptsCapacity,
  allowedChildTypes,
  locationTypeLabel,
  type LocationTypeItem,
} from "@/features/physical-archive/model/location";

const idle: LocationActionState = { status: "idle" };

function useDialogResult(state: LocationActionState, close: () => void) {
  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "İşlem tamamlandı.");
      close();
    }
  }, [state, close]);
}

function Fields({ typeCode, types, initial }: {
  typeCode: string; types: LocationTypeItem[]; initial?: LocationOccupancyItem;
}) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="location-code">Konum kodu</Label>
      <Input id="location-code" name="code" required maxLength={100} defaultValue={initial?.code} placeholder="O1KAD1-RAF-1" />
    </div>
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="location-barcode">Barkod</Label>
      <Input id="location-barcode" name="barcode" required maxLength={100} defaultValue={initial?.barcode} placeholder="LOC-O1KAD1R1" />
    </div>
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <Label htmlFor="location-name">Görünen ad</Label>
      <Input id="location-name" name="name" required maxLength={300} defaultValue={initial?.name} placeholder="Raf 1" />
    </div>
    {acceptsCapacity(typeCode, types) && <div className="flex flex-col gap-1.5 sm:col-span-2">
      <Label htmlFor="location-capacity">Kapasite (klasör adedi)</Label>
      <Input id="location-capacity" name="capacity" type="number" min={1} step={1} defaultValue={initial?.capacity ?? ""} />
      <span className="text-xs text-muted-foreground">Boş bırakılırsa doluluk oranı hesaplanmaz.</span>
    </div>}
  </div>;
}

function Error({ state }: { state: LocationActionState }) {
  if (state.status !== "error") return null;
  return <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{state.message}</p>;
}

/** Kök konum yoksa ilk kurum arşivini açmak için; varsa alt düğüm eklemek için. */
export function NewLocationDialog({ parent, types }: {
  parent?: LocationOccupancyItem;
  types: LocationTypeItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, action, pending] = useActionState(createLocationAction, idle);
  useDialogResult(state, () => setIsOpen(false));

  // Altına açılabilecek seviyeler katalogdan gelir; zincir katı değil, kurum
  // ara seviye atlayabilir ya da kendi seviyesini ekleyebilir.
  const options = parent ? allowedChildTypes(parent.type, types) : types.filter(type => type.isActive);
  const [typeCode, setTypeCode] = useState(options[0]?.code ?? "");

  if (options.length === 0) return null;

  const label = parent ? "Alt konum ekle" : "Kök konum ekle";

  return <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <DialogTrigger
      render={<Button size={parent ? "icon-sm" : "sm"} variant={parent ? "ghost" : "default"} />}
      aria-label={parent ? `${parent.code} altına konum ekle` : label}
    >
      {parent ? <Plus className="size-4" aria-hidden /> : <><FolderPlus className="size-4" aria-hidden />{label}</>}
    </DialogTrigger>
    <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
      <DialogHeader className="shrink-0">
        <DialogTitle>{label}</DialogTitle>
        <DialogDescription>
          {parent
            ? `${parent.code} · ${parent.name} altına yeni bir konum tanımlanır.`
            : "Hiyerarşinin kökünü tanımlayın."}
        </DialogDescription>
      </DialogHeader>
      <form action={action} className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {parent && <input type="hidden" name="parentId" value={parent.id} />}
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Yerleşim seviyesi
            <select name="typeCode" aria-label="Yerleşim seviyesi" required value={typeCode} onChange={event => setTypeCode(event.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm font-normal">
              {options.map(option => <option key={option.code} value={option.code}>{option.level}. {option.name}</option>)}
            </select>
            <span className="text-xs font-normal text-muted-foreground">Seviyeler Tanımlar → Arşiv Yerleşim Seviyeleri ekranından yönetilir.</span>
          </label>
          <Fields typeCode={typeCode} types={types} />
          <Error state={state} />
        </div>
        <DialogFooter className="shrink-0">
          <DialogClose render={<Button type="button" variant="outline" />}>İptal</DialogClose>
          <Button type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export function EditLocationDialog({ location, types }: { location: LocationOccupancyItem; types: LocationTypeItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, action, pending] = useActionState(updateLocationAction, idle);
  useDialogResult(state, () => setIsOpen(false));

  return <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <DialogTrigger render={<Button size="icon-sm" variant="ghost" />} aria-label={`${location.code} konumunu düzenle`}>
      <Pencil className="size-4" aria-hidden />
    </DialogTrigger>
    <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
      <DialogHeader className="shrink-0">
        <DialogTitle>Konumu düzenle</DialogTitle>
        <DialogDescription>
          {location.typeName || locationTypeLabel(location.type, types)} · {location.code}. Seviye ve üst konum değiştirilemez;
          bunlar hiyerarşinin şeklini belirler.
        </DialogDescription>
      </DialogHeader>
      <form action={action} className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <input type="hidden" name="id" value={location.id} />
          <Fields typeCode={location.type} types={types} initial={location} />
          <Error state={state} />
        </div>
        <DialogFooter className="shrink-0">
          <DialogClose render={<Button type="button" variant="outline" />}>İptal</DialogClose>
          <Button type="submit" disabled={pending}>{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

/**
 * Silme ve pasife alma aynı diyalogda.
 *
 * Silme yalnız boş konumda mümkün; altında düğüm ya da içinde dosya varsa
 * sunucu reddeder ve gerekçeyi döner. Kullanımdan çıkarmanın güvenli yolu
 * pasife almaktır: kayıt ve geçmiş korunur, yeni yerleştirme engellenir.
 */
export function RemoveLocationDialog({ location, childCount }: {
  location: LocationOccupancyItem;
  childCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  const blocked = childCount > 0 || location.folderCount > 0;

  async function run(key: string, work: () => Promise<LocationActionState>) {
    if (pending) return;
    setPending(key); setError("");
    const result = await work();
    setPending("");
    if (result.status === "error") { setError(result.message ?? "İşlem tamamlanamadı."); return; }
    toast.success(result.message ?? "İşlem tamamlandı.");
    setIsOpen(false);
  }

  return <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <DialogTrigger render={<Button size="icon-sm" variant="ghost" />} aria-label={`${location.code} konumunu kaldır`}>
      <Trash2 className="size-4" aria-hidden />
    </DialogTrigger>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{location.code} · {location.name}</DialogTitle>
        <DialogDescription>{location.typeName}</DialogDescription>
      </DialogHeader>

      <div className="space-y-3 text-sm">
        <dl className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
          <div><dt className="text-muted-foreground">Alt konum</dt><dd className="mt-1 font-medium tabular-nums">{childCount}</dd></div>
          <div><dt className="text-muted-foreground">Buradaki dosya</dt><dd className="mt-1 font-medium tabular-nums">{location.folderCount}</dd></div>
        </dl>

        {blocked
          ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              Bu konum silinemez: {childCount > 0 && `altında ${childCount} konum var`}
              {childCount > 0 && location.folderCount > 0 && " ve "}
              {location.folderCount > 0 && `içinde ${location.folderCount} fiziksel dosya duruyor`}.
              Kullanımdan çıkarmak için pasife alın; kayıtlar ve geçmiş korunur, yeni dosya yerleştirilemez.
            </p>
          : <p className="text-xs leading-5 text-muted-foreground">
              Konum boş, silinebilir. Silme geri alınamaz. Geçmişi korumak istiyorsanız pasife almayı tercih edin.
            </p>}

        {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Vazgeç</DialogClose>
        <Button type="button" variant="outline" disabled={!!pending}
          onClick={() => void run("active", () => setLocationActiveAction(location.id, !location.isActive))}>
          <Power className="size-4" aria-hidden />
          {pending === "active" ? "Uygulanıyor…" : location.isActive ? "Pasife al" : "Yeniden aç"}
        </Button>
        {!blocked && <Button type="button" variant="destructive" disabled={!!pending}
          onClick={() => void run("delete", () => deleteLocationAction(location.id))}>
          {pending === "delete" ? "Siliniyor…" : "Kalıcı olarak sil"}
        </Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
