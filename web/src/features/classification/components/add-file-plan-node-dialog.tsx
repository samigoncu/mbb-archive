"use client";

import { useMemo, useState } from "react";
import { Check, CornerDownRight, Plus, Search } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { addFilePlanItem } from "@/features/classification/api/add-file-plan-item";
import type { FilePlanNode } from "@/features/classification/model/classification";

const maxLevel = 12;

/** Türkçe'de "İ/ı" ayrımı nedeniyle arama karşılaştırması yerel kurala göre yapılır. */
const fold = (value: string) => value.toLocaleLowerCase("tr");

export function AddFilePlanNodeDialog({
  planId,
  nodes,
  defaultParentId = null,
  onNodeAdded,
  triggerLabel = "Yeni Konu Kodu Ekle",
  buttonSize = "default",
  variant = "default",
}: {
  planId: string;
  nodes: FilePlanNode[];
  defaultParentId?: string | null;
  onNodeAdded: (newNode: FilePlanNode) => void;
  triggerLabel?: string;
  buttonSize?: "default" | "sm" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const [parentId, setParentId] = useState<string>(defaultParentId ?? "");
  const [search, setSearch] = useState("");
  const [suffix, setSuffix] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [useManualCode, setUseManualCode] = useState(false);
  const [title, setTitle] = useState("");
  const [isSelectable, setIsSelectable] = useState(true);

  const parent = nodes.find(node => node.id === parentId) ?? null;

  // Seviye üst düğümden türetilir; elle girilebilmesi üst düğümle tutarsız
  // ağaç kurulmasına yol açıyordu.
  const level = parent ? Math.min(maxLevel, parent.level + 1) : 1;
  const prefix = parent ? `${parent.code}.` : "";
  const code = useManualCode ? manualCode.trim() : `${prefix}${suffix.trim()}`;

  const existing = useMemo(
    () => new Set(nodes.map(node => fold(node.code))),
    [nodes],
  );
  const duplicate = code.length > 0 && existing.has(fold(code));
  const tooDeep = parent !== null && parent.level >= maxLevel;

  const options = useMemo(() => {
    const needle = fold(search.trim());
    const sorted = [...nodes].sort((a, b) => a.code.localeCompare(b.code, "tr"));
    if (!needle) return sorted;
    return sorted.filter(node => fold(`${node.code} ${node.title}`).includes(needle));
  }, [nodes, search]);

  // Seçili düğüm arama dışında kalırsa listeden düşmesin; seçim görünür kalmalı.
  const visible = parent && !options.some(node => node.id === parent.id)
    ? [parent, ...options]
    : options;

  function reset(open: boolean) {
    setIsOpen(open);
    if (!open) return;
    setParentId(defaultParentId ?? "");
    setSearch("");
    setSuffix("");
    setManualCode("");
    setUseManualCode(false);
    setTitle("");
    setIsSelectable(true);
    setError("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!code || !title.trim()) {
      setError("Konu kodu ve başlık zorunludur.");
      return;
    }
    if (duplicate) {
      setError(`${code} kodu bu planda zaten tanımlı.`);
      return;
    }
    if (tooDeep) {
      setError(`Dosya planı en fazla ${maxLevel} seviye derinleşebilir.`);
      return;
    }

    setIsPending(true);
    try {
      const result = await addFilePlanItem(planId, {
        parentId: parentId || null,
        code,
        title: title.trim(),
        level,
        isSelectable,
      });

      onNodeAdded({
        id: result.id,
        parentId: parentId || null,
        code,
        title: title.trim(),
        level,
        isSelectable,
        isActive: true,
      });
      toast.success(`${code} · ${title.trim()} eklendi.`);
      setIsOpen(false);
    } catch (exception) {
      setError(exception instanceof Error && exception.message
        ? exception.message
        : "Konu kodu eklenemedi.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={reset}>
      <DialogTrigger render={<Button size={buttonSize} variant={variant} className="gap-1.5" />}>
        <Plus className="size-4" aria-hidden />
        {buttonSize !== "icon" ? <span>{triggerLabel}</span> : null}
      </DialogTrigger>

      {/* Başlık ve düğmeler sabit kalır, yalnız alanlar kayar. */}
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Yeni konu kodu</DialogTitle>
          <DialogDescription>
            Standart dosya planına ana grup, alt grup veya konu kodu ekleyin. Seviye seçtiğiniz üst koddan türetilir.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <section className="space-y-2">
              <Label htmlFor="parent-search">Üst konu kodu</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="parent-search"
                  type="search"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Kod veya başlıkta ara…"
                  className="pl-8"
                />
              </div>

              <div role="radiogroup" aria-label="Üst konu kodu" className="max-h-52 overflow-y-auto rounded-md border border-input bg-card">
                <label className={cn(
                  "flex min-h-10 cursor-pointer items-center gap-3 border-b border-border px-3 py-2 transition-colors hover:bg-muted/60 focus-within:ring-2 focus-within:ring-ring focus-within:ring-inset",
                  parentId === "" && "bg-accent",
                )}>
                  <input type="radio" name="parent" value="" checked={parentId === ""} className="sr-only"
                    onChange={() => { setParentId(""); setSuffix(""); }} />
                  <Marker checked={parentId === ""} />
                  <span className="text-sm font-medium">Kök düğüm — 1. seviye ana grup</span>
                </label>

                {visible.map(node => {
                  const checked = node.id === parentId;
                  return (
                    <label key={node.id} className={cn(
                      "flex min-h-10 cursor-pointer items-center gap-3 border-b border-border px-3 py-2 transition-colors last:border-b-0 hover:bg-muted/60 focus-within:ring-2 focus-within:ring-ring focus-within:ring-inset",
                      checked && "bg-accent",
                    )}>
                      <input type="radio" name="parent" value={node.id} checked={checked} className="sr-only"
                        onChange={() => { setParentId(node.id); setSuffix(""); }} />
                      <Marker checked={checked} />
                      <span
                        className="min-w-0 flex-1"
                        style={{ paddingLeft: `${Math.max(0, node.level - 1) * 0.75}rem` }}
                      >
                        <span className="block truncate font-mono text-xs font-semibold">{node.code}</span>
                        <span className="block truncate text-xs text-muted-foreground">{node.title}</span>
                      </span>
                      <span className="shrink-0 text-2xs uppercase tracking-wider text-muted-foreground">
                        {node.level}. seviye
                      </span>
                    </label>
                  );
                })}

                {visible.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">Aramaya uyan konu kodu yok.</p>
                )}
              </div>

              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CornerDownRight className="size-3.5 shrink-0" aria-hidden />
                {parent
                  ? <>Yeni kod <strong className="text-foreground">{parent.code} · {parent.title}</strong> altına, <strong className="text-foreground">{level}. seviye</strong> olarak eklenecek.</>
                  : <>Yeni kod planın kökünde, <strong className="text-foreground">1. seviye</strong> ana grup olarak eklenecek.</>}
              </p>
              {tooDeep && <p role="alert" className="text-xs text-destructive">
                Bu kodun altına yeni seviye açılamaz; plan en fazla {maxLevel} seviye derinleşir.
              </p>}
            </section>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="node-code">Konu kodu</Label>
                {useManualCode || !parent ? (
                  <Input
                    id="node-code"
                    value={useManualCode ? manualCode : suffix}
                    onChange={event => (useManualCode ? setManualCode : setSuffix)(event.target.value)}
                    placeholder={parent ? `${parent.code}.01` : "805"}
                    className="font-mono"
                    aria-invalid={duplicate || undefined}
                    required
                  />
                ) : (
                  // Üst kodun öneki sabit gösterilir; kullanıcı yalnız kendi
                  // parçasını yazar, böylece hiyerarşiyle uyumsuz kod oluşmaz.
                  <div className={cn(
                    "flex h-8 items-center rounded-lg border border-input bg-transparent pr-2 pl-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                    duplicate && "border-destructive",
                  )}>
                    <span className="shrink-0 font-mono text-sm text-muted-foreground">{prefix}</span>
                    <input
                      id="node-code"
                      value={suffix}
                      onChange={event => setSuffix(event.target.value)}
                      placeholder="01"
                      className="min-w-0 flex-1 bg-transparent font-mono text-sm outline-none"
                      aria-invalid={duplicate || undefined}
                      required
                    />
                  </div>
                )}
                {parent && (
                  <button
                    type="button"
                    className="self-start text-xs text-primary underline-offset-2 hover:underline"
                    onClick={() => {
                      setUseManualCode(current => !current);
                      setManualCode(code);
                    }}
                  >
                    {useManualCode ? "Üst kodun önekini kullan" : "Kodu tam olarak elle gir"}
                  </button>
                )}
                {duplicate && <span role="alert" className="text-xs text-destructive">{code} bu planda zaten var.</span>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="node-title">Konu başlığı</Label>
                <Input
                  id="node-title"
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  placeholder="İmar Plan Tadilatları ve Revizyon Talepleri"
                  required
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3">
              <input
                type="checkbox"
                checked={isSelectable}
                onChange={event => setIsSelectable(event.target.checked)}
                className="mt-0.5 size-4 shrink-0"
              />
              <span className="text-sm">
                <span className="block font-medium">Bu koda dosya açılabilir</span>
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  İşaretliyse belge ve fiziksel klasörler doğrudan bu koda bağlanabilir. Yalnız gruplama
                  amaçlı ara başlıklarda işareti kaldırın.
                </span>
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <DialogClose render={<Button type="button" variant="outline" />}>İptal</DialogClose>
            <Button type="submit" disabled={isPending || duplicate || tooDeep}>
              {isPending ? "Ekleniyor…" : "Konu kodunu ekle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Marker({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
        checked ? "border-primary bg-primary text-primary-foreground" : "border-input",
      )}
    >
      {checked && <Check className="size-3" />}
    </span>
  );
}
