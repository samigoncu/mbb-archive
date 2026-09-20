"use client";

import { useState } from "react";
import { Plus, Building2, FolderTree } from "lucide-react";
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
import { ActionForm } from "@/components/action-form";
import { definitionAction } from "@/features/classification/api/definition-actions";
import type { OrganizationUnit } from "@/features/organization/model/unit-plans";
import type { UnitTypeItem } from "@/features/organization/model/unit-type";

export function CreateUnitDialog({
  units,
  unitTypes = [],
  defaultParentId,
}: {
  units: OrganizationUnit[];
  /** Teşkilat seviyeleri; seçim üst birimin seviyesine göre süzülür. */
  unitTypes?: UnitTypeItem[];
  defaultParentId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [parentId, setParentId] = useState(defaultParentId ?? "");
  const activeUnits = units.filter((u) => u.isActive);

  // Seçilebilir seviyeler üst birime bağlıdır: alt birim, üstünden daha derin
  // bir kademede olmalıdır. Üst birimin seviyesi atanmamışsa kural uygulanmaz
  // ve tüm etkin seviyeler açık kalır.
  const parentType = unitTypes.find(
    (type) => type.code === units.find((u) => u.id === parentId)?.typeCode,
  );
  const selectableTypes = unitTypes.filter(
    (type) => type.isActive && (!parentType || parentType.allowedChildCodes.includes(type.code)),
  );

  // Group active units hierarchically for clean dropdown indentation
  const sortedUnits = [...activeUnits].sort((a, b) =>
    a.path.localeCompare(b.path, "tr"),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            size="sm"
            className="gap-1.5 font-medium shadow-xs"
          />
        }
      >
        <Plus className="size-4" aria-hidden />
        Yeni Birim
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="size-4" aria-hidden />
            </span>
            <DialogTitle className="text-base font-semibold">
              Yeni Kurum Birimi Tanımla
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Arşiv organizasyon yapısına yeni bir müdürlük, şube veya servis
            tanımlayın.
          </DialogDescription>
        </DialogHeader>

        <ActionForm action={definitionAction} label="Birimi Oluştur">
          <input type="hidden" name="operation" value="unit-create" />

          <div className="space-y-3.5 py-1 text-left">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-unit-code" className="text-xs font-medium">
                  Birim Kodu <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="create-unit-code"
                  name="code"
                  required
                  maxLength={40}
                  placeholder="ör. BİLG-01"
                  className="font-mono text-xs uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-unit-short" className="text-xs font-medium">
                  Kısa Ad
                </Label>
                <Input
                  id="create-unit-short"
                  name="shortName"
                  maxLength={40}
                  placeholder="ör. BİLG"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-unit-name" className="text-xs font-medium">
                Birim Adı <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-unit-name"
                name="name"
                required
                maxLength={300}
                placeholder="ör. Bilgi İşlem Dairesi Başkanlığı"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-unit-parent" className="text-xs font-medium">
                Bağlı Olduğu Üst Birim
              </Label>
              <select
                id="create-unit-parent"
                name="parentId"
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">🏢 Kök Birim (En Üst Düzey Yönetim)</option>
                {sortedUnits.map((unit) => {
                  const depth = (unit.path.match(/\//g) || []).length;
                  const indent = "— ".repeat(Math.max(0, depth));
                  return (
                    <option key={unit.id} value={unit.id}>
                      {indent}
                      {unit.name} ({unit.code})
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Kök birim seçilirse en üst seviyede yer alır. Alt birim seçilirse
                hiyerarşik olarak onun altına bağlanır.
              </p>
            </div>

            {unitTypes.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="create-unit-type" className="text-xs font-medium">
                  Teşkilat Seviyesi
                </Label>
                <select
                  id="create-unit-type"
                  name="typeCode"
                  defaultValue=""
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Belirtilmedi</option>
                  {selectableTypes.map((type) => (
                    <option key={type.code} value={type.code}>
                      {type.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {parentType
                    ? `“${parentType.name}” altına açılabilecek seviyeler listelenir.`
                    : "İsteğe bağlıdır; sonradan da atanabilir."}
                </p>
              </div>
            )}
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}

