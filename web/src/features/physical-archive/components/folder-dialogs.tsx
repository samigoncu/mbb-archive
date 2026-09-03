"use client";

import { useActionState, useEffect, useState } from "react";
import { FolderPlus, MoveRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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

export function NewFolderDialog({ locations }: { locations: LocationListItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, action, pending] = useActionState(createFolderAction, initialState);

  useDialogResult(state, () => setIsOpen(false));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <FolderPlus className="size-4" aria-hidden />
        Yeni Dosya
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Dosya</DialogTitle>
          <DialogDescription>
            Dosyayı fiziksel arşiv hiyerarşisinde bir konuma yerleştirin.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          <Field id="barcode" label="Dosya Barkodu" required />
          <Field id="title" label="Dosya Başlığı" required />
          <Field id="filePlanCode" label="Dosya Planı Kodu" placeholder="754.01" required />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Arşiv Konumu</span>
            <LocationPicker locations={locations} name="locationId" />
          </div>

          <ErrorText state={state} />

          <DialogFooter>
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
}: {
  folderId: string;
  folderBarcode: string;
  currentLocationId: string;
  locations: LocationListItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, action, pending] = useActionState(moveFolderAction, initialState);

  useDialogResult(state, () => setIsOpen(false));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={<Button variant="ghost" size="icon" className="size-9" />}
        aria-label={`${folderBarcode} dosyasını taşı`}
      >
        <MoveRight className="size-4" aria-hidden />
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dosyayı Taşı</DialogTitle>
          <DialogDescription>{folderBarcode} için yeni konum seçin.</DialogDescription>
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
