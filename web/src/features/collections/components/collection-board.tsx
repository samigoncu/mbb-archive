"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { FolderPlus, Star, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { EmptyState, Notice, Panel } from "@/components/ui/page";
import {
  createCollectionAction,
  deleteCollectionAction,
  updateCollectionAction,
} from "@/features/collections/api/collection-actions";
import type { CollectionListItem } from "@/features/collections/model/collection";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";

const initialState: ActionState = { status: "idle" };

export function CollectionBoard({
  collections,
}: {
  collections: CollectionListItem[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CreateCollectionDialog />
      </div>

      {collections.length === 0 ? (
        <Panel>
          <EmptyState
            icon={Star}
            title="Henüz koleksiyon yok"
            description="Koleksiyon, belgeleri fiziksel klasörlerinden taşımadan konu veya iş bazında gruplamanızı sağlar."
          />
        </Panel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionCard({ collection }: { collection: CollectionListItem }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-semibold">
          {collection.name}
        </h3>
        {collection.isShared ? (
          <Badge variant="info">
            <Users className="size-3" aria-hidden />
            Paylaşılan
          </Badge>
        ) : (
          <Badge variant="secondary">Kişisel</Badge>
        )}
      </div>

      {collection.description ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {collection.description}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {collection.itemCount} belge · {collection.ownerSubject}
      </p>

      <div className="mt-1 flex items-center justify-between gap-2">
        <Link
          href={`/koleksiyonlar/${collection.id}`}
          className="text-xs font-medium text-primary hover:underline"
        >
          İçeriği aç
        </Link>
        <EditCollectionDialog collection={collection} />
        <DeleteCollectionDialog collection={collection} />
      </div>
    </article>
  );
}

function CreateCollectionDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    createCollectionAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Koleksiyon oluşturuldu.");
      setIsOpen(false);
    }

    if (state.status === "error") {
      toast.error(state.message ?? "Koleksiyon oluşturulamadı.");
    }
  }, [state]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <FolderPlus className="size-4" aria-hidden />
        Yeni Koleksiyon
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni koleksiyon</DialogTitle>
          <DialogDescription>
            Belgeler kopyalanmaz; koleksiyon yalnızca onlara işaret eder.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="collection-name">Ad</Label>
            <Input
              id="collection-name"
              name="name"
              placeholder="Örn: Sayıştay 2026"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="collection-description">
              Açıklama{" "}
              <span className="text-muted-foreground">(isteğe bağlı)</span>
            </Label>
            <Input
              id="collection-description"
              name="description"
              placeholder="Denetim için hazırlanacak belgeler"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="collection-shared" name="isShared" />
            <Label htmlFor="collection-shared" className="text-sm font-normal">
              Kurum içinde paylaş
            </Label>
          </div>

          <p className="text-xs text-muted-foreground">
            Paylaşılan koleksiyonu herkes görür, yalnız sahibi değiştirebilir.
          </p>

          {state.status === "error" && <p role="alert" className="text-sm text-destructive">{state.message}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Vazgeç
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Oluşturuluyor…" : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCollectionDialog({
  collection,
}: {
  collection: CollectionListItem;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    deleteCollectionAction,
    initialState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message ?? "Koleksiyon kaldırıldı.");
      setIsOpen(false);
    }

    if (state.status === "error") {
      toast.error(state.message ?? "Koleksiyon silinemedi.");
    }
  }, [state]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="xs" variant="ghost" />}>
        <Trash2 className="size-3.5" aria-hidden />
        <span className="sr-only">Koleksiyonu kaldır</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Koleksiyonu kaldır</DialogTitle>
          <DialogDescription>{collection.name}</DialogDescription>
        </DialogHeader>

        <Notice>
          Bu işlem yalnızca gruplamayı kaldırır. İçindeki {collection.itemCount}{" "}
          belge arşivde ve fiziksel klasöründe kalır.
        </Notice>

        <form action={formAction}>
          <input type="hidden" name="collectionId" value={collection.id} />
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Vazgeç
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? "Kaldırılıyor…" : "Kaldır"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditCollectionDialog({
  collection,
}: {
  collection: CollectionListItem;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    updateCollectionAction,
    initialState,
  );
  useEffect(() => {
    if (state.status === "success") {
      setOpen(false);
      toast.success(state.message);
    }
  }, [state]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="xs" variant="outline" />}>
        Düzenle / Paylaşım
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Koleksiyonu düzenle</DialogTitle>
          <DialogDescription>
            Paylaşımı kapattığınızda koleksiyon kişisel olur. Arşiv belgelerinin
            izinleri korunur.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="collectionId" value={collection.id} />
          <label>
            Ad
            <Input
              name="name"
              required
              maxLength={200}
              defaultValue={collection.name}
            />
          </label>
          <label>
            Açıklama
            <Input
              name="description"
              defaultValue={collection.description ?? ""}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isShared"
              defaultChecked={collection.isShared}
            />
            Kurum içinde paylaş
          </label>
          {state.status === "error" && <p role="alert">{state.message}</p>}
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
