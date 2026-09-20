"use client";

import { useActionState, useEffect, useState } from "react";
import { FolderPlus, MoveRight } from "lucide-react";
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
import {
  createFolderAction,
  moveFolderAction,
  type ActionState,
} from "@/features/physical-archive/api/folder-actions";
import { LocationPicker } from "@/features/physical-archive/components/location-picker";
import type { LocationListItem } from "@/features/physical-archive/model/location";

const initialState: ActionState = { status: "idle" };

/** Input bileşeniyle aynı yükseklik ve kenarlık; yerel select'ler onunla hizalanır. */
const selectClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm font-normal transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function NewFolderDialog({
  locations,
  nodes = [], units = [], digitalDossier, ownerUnitId, assignments = [],
}: {
  assignments?: import("@/features/organization/model/unit-plans").UnitPlanAssignment[];
  ownerUnitId?: string;
  locations: LocationListItem[];
  units?: import("@/features/dossiers/model/dossier").ArchiveUnit[];
  digitalDossier?: import("@/features/dossiers/model/dossier").DigitalDossier | null;
  nodes?: import("@/features/classification/model/classification").FilePlanNode[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [owner, setOwner] = useState(digitalDossier?.ownerUnitId ?? ownerUnitId ?? units.find(unit => unit.isPrimary && unit.canManagePhysical)?.id ?? units.find(unit => unit.canManagePhysical)?.id ?? "");
  const [code, setCode] = useState(digitalDossier?.filePlanCode ?? "");
  const assignedCodes = new Set(assignments.filter(item => item.unitId === owner).map(item => item.code));
  const [state, action, pending] = useActionState(
    createFolderAction,
    initialState,
  );

  useDialogResult(state, () => setIsOpen(false));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <FolderPlus className="size-4" aria-hidden />
        Yeni Dosya
      </DialogTrigger>
      {/* Başlık ve düğmeler sabit kalır, yalnız alanlar kayar: diyalog seçim
          yapıldıkça büyümez. */}
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Yeni Dosya</DialogTitle>
          <DialogDescription>
            Dosyayı fiziksel arşiv hiyerarşisinde bir konuma yerleştirin.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Sahip birim
                <select name="ownerUnitId" required value={owner} onChange={event => { setOwner(event.target.value); setCode(""); }} className={selectClass}>
                  {units.filter(u => u.canManagePhysical && u.isActive && (!digitalDossier || u.id === digitalDossier.ownerUnitId)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Dosya Planı Kodu
                <select
                  name="filePlanCode"
                  value={code} onChange={event => setCode(event.target.value)}
                  required
                  className={selectClass}
                >
                  <option value="">Kod seçin</option>
                  {nodes.filter(n => assignedCodes.has(n.code) && (!digitalDossier || n.code === digitalDossier.filePlanCode)).map((n) => (
                    <option key={n.id} value={n.code}>
                      {n.code} · {n.title}
                    </option>
                  ))}
                </select>
              </label>

              <Field id="barcode" label="Dosya Barkodu" required />
              <Field id="title" label="Dosya Başlığı" required />
            </div>

            {digitalDossier && <><input type="hidden" name="digitalDossierId" value={digitalDossier.id} /><p className="rounded-md bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">Dijital karşılığı: <span className="font-medium text-foreground">{digitalDossier.title}</span></p></>}

            {!assignedCodes.size && <p className="text-sm text-muted-foreground">Bu birime SDP başlığı atanmamış. Birim Yönetimi ekranından eşleştirme yapılmalıdır.</p>}

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Arşiv Konumu</span>
              <LocationPicker locations={locations} name="locationId" />
            </div>

            <ErrorText state={state} />
          </div>

          <DialogFooter className="shrink-0">
            <DialogClose render={<Button type="button" variant="outline" />}>
              İptal
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MoveFolderDialog({
  folderId,
  folderBarcode,
  currentLocationId,
  locations,
  triggerLabel,
}: {
  folderId: string;
  folderBarcode: string;
  currentLocationId: string;
  locations: LocationListItem[];
  triggerLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, action, pending] = useActionState(
    moveFolderAction,
    initialState,
  );

  useDialogResult(state, () => setIsOpen(false));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={<Button variant={triggerLabel ? "outline" : "ghost"} size={triggerLabel ? "sm" : "icon"} />}
        aria-label={triggerLabel ? `${folderBarcode} · ${triggerLabel}` : `${folderBarcode} dosyasını taşı`}
      >
        <MoveRight className="size-4" aria-hidden />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dosyayı Taşı</DialogTitle>
          <DialogDescription>
            {folderBarcode} için yeni raf veya kutu seçin. Klasördeki tüm belgelerin fiziksel konumu değişir.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="folderId" value={folderId} />
          <LocationPicker
            locations={locations}
            name="destinationLocationId"
            initialLocationId={currentLocationId}
          />

          <ErrorText state={state} />

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Taşınıyor…" : "Taşı"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function useDialogResult(state: ActionState, onSuccess: () => void) {
  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      onSuccess();
    }
  }, [state, onSuccess]);
}

function ErrorText({ state }: { state: ActionState }) {
  if (state.status !== "error") {
    return null;
  }

  return (
    <p role="alert" className="text-sm text-destructive">
      {state.message}
    </p>
  );
}

function Field({
  id,
  label,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} placeholder={placeholder} required={required} />
    </div>
  );
}
