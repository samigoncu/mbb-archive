"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Search,
  FolderArchive,
  User,
  Check,
  RotateCcw,
  BookOpenCheck,
  X,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Building2,
  FileText,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import type { ActionState } from "@/features/physical-archive/api/folder-actions";
import type { LoanDetailsItem } from "../model/loan";
import { checkoutLoanAction } from "../api/loan-actions";
import {
  searchLoanBorrowers,
  searchLoanFolders,
  type LoanBorrower,
} from "../api/loan-selection-actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const QUICK_PURPOSES = [
  "Denetim ve Teftiş İncelemesi",
  "Hukuki Süreç / Dava Dosyası",
  "Birim İçi Çalışma ve İnceleme",
  "Sayıştay Denetimi",
  "Vatandaş Bilgi Edinme Talebi",
];

const DURATION_PRESETS = [
  { label: "7 Gün (1 Hafta)", days: 7 },
  { label: "15 Gün", days: 15 },
  { label: "30 Gün (1 Ay)", days: 30 },
  { label: "60 Gün (2 Ay)", days: 60 },
];

export function LoanCheckoutForm({
  initialFolders,
  folderCount,
  initialBorrowers = [],
  borrowerCount = 0,
  onLoanCreated,
}: {
  initialFolders: FolderListItem[];
  folderCount: number;
  initialBorrowers?: LoanBorrower[];
  borrowerCount?: number;
  onLoanCreated?: (newLoan: LoanDetailsItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Folders
  const [folders, setFolders] = useState(initialFolders);
  const [totalFolders, setTotalFolders] = useState(folderCount);
  const [folderPage, setFolderPage] = useState(1);
  const [folderQuery, setFolderQuery] = useState("");
  const [folder, setFolder] = useState<FolderListItem | null>(null);

  // Step 2: Borrowers
  const [borrowers, setBorrowers] = useState<LoanBorrower[]>(initialBorrowers);
  const [borrower, setBorrower] = useState<LoanBorrower | null>(null);
  const [borrowerPage, setBorrowerPage] = useState(1);
  const [borrowerTotal, setBorrowerTotal] = useState(
    borrowerCount || initialBorrowers.length,
  );
  const [borrowerQuery, setBorrowerQuery] = useState("");
  const [searched, setSearched] = useState(initialBorrowers.length > 0);

  // Step 3: Purpose & Due Date
  const [purpose, setPurpose] = useState("");
  const todayStr = new Date().toISOString().split("T")[0];
  const [dueAt, setDueAt] = useState(
    () => new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
  );

  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const toggleFolder = (item: FolderListItem) => {
    if (folder?.id === item.id) {
      setFolder(null);
    } else {
      setFolder(item);
      setStep(2);
    }
  };

  const toggleBorrower = (item: LoanBorrower) => {
    if (borrower?.subjectId === item.subjectId) {
      setBorrower(null);
    } else {
      setBorrower(item);
      setStep(3);
    }
  };

  const findFolders = (page: number) =>
    start(async () => {
      setError("");
      const result = await searchLoanFolders(folderQuery, page);
      if (result.data) {
        setFolders(result.data.items);
        setTotalFolders(result.data.totalCount);
        setFolderPage(page);
      } else {
        setError(result.error ?? "Dosyalar alınamadı.");
      }
    });

  const findBorrowers = (page: number) =>
    start(async () => {
      setError("");
      const result = await searchLoanBorrowers(borrowerQuery, page);
      if (result.data) {
        setBorrowers(result.data.items);
        setBorrowerTotal(result.data.totalCount);
        setBorrowerPage(page);
        setSearched(true);
      } else {
        setError(result.error ?? "Personel alınamadı.");
      }
    });

  const handleReset = () => {
    setFolder(null);
    setBorrower(null);
    setPurpose("");
    setError("");
    setFolderQuery("");
    setBorrowerQuery("");
    setStep(1);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      handleReset();
    }
  };

  const handleCheckout = async (prev: ActionState, data: FormData) => {
    const currentFolder = folder;
    const currentBorrower = borrower;
    const currentPurpose = (data.get("purpose") as string) || purpose;
    const currentDueAt = (data.get("dueAt") as string) || dueAt;

    const res = await checkoutLoanAction(prev, data);
    if (res.status === "success") {
      toast.success(res.message || "Dosya ödünç verildi.");
      if (currentFolder && currentBorrower) {
        const createdLoan: LoanDetailsItem = {
          id: `loan-${Date.now()}`,
          folderId: currentFolder.id,
          folderBarcode: currentFolder.barcode,
          folderTitle: currentFolder.title,
          filePlanCode: currentFolder.filePlanCode,
          borrowerSubjectId: currentBorrower.subjectId,
          purpose: currentPurpose,
          status: "Active",
          checkedOutAt: new Date().toISOString(),
          dueAt: `${currentDueAt}T23:59:59+03:00`,
          returnedAt: null,
          returnNote: null,
          isOverdue: false,
          daysOverdue: 0,
        };
        onLoanCreated?.(createdLoan);
      }
      handleReset();
      setOpen(false);
    }
    return res;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            className="gap-2 bg-primary font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
          />
        }
      >
        <Plus className="size-4" aria-hidden />
        <span>Yeni ödünç / zimmet kaydı</span>
      </DialogTrigger>

      <DialogContent className="flex h-[640px] max-h-[90vh] w-[95vw] sm:max-w-none sm:w-[680px] md:w-[760px] lg:w-[820px] flex-col gap-0 overflow-hidden p-0 rounded-2xl border border-border/80 shadow-2xl bg-card">
        {/* Header */}
        <DialogHeader className="border-b border-border/60 bg-gradient-to-b from-muted/30 to-transparent px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs shrink-0">
              <BookOpenCheck className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  Yeni Ödünç / Zimmet Kaydı
                </DialogTitle>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                  Adım {step} / 3
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Fiziksel arşiv klasörünü teslim alacak kurum personelini belirleyin.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Modern Stepper Tabs */}
        <div className="grid grid-cols-3 gap-1.5 border-b border-border/50 bg-muted/30 p-1.5 shrink-0">
          <button
            type="button"
            aria-label="1. Dosya Seçimi"
            onClick={() => setStep(1)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-1.5 px-3 text-xs font-medium transition-all duration-150",
              step === 1
                ? "bg-background text-foreground shadow-xs ring-1 ring-border/60 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                folder
                  ? "bg-emerald-500 text-white shadow-xs"
                  : step === 1
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {folder ? <Check className="size-3" aria-hidden /> : "1"}
            </span>
            <span className="truncate">
              {folder ? folder.barcode : "1. Dosya Seçimi"}
            </span>
          </button>

          <button
            type="button"
            aria-label="2. Personel Seçimi"
            onClick={() => setStep(2)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-1.5 px-3 text-xs font-medium transition-all duration-150",
              step === 2
                ? "bg-background text-foreground shadow-xs ring-1 ring-border/60 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                borrower
                  ? "bg-emerald-500 text-white shadow-xs"
                  : step === 2
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {borrower ? <Check className="size-3" aria-hidden /> : "2"}
            </span>
            <span className="truncate">
              {borrower ? borrower.subjectId : "2. Personel Seçimi"}
            </span>
          </button>

          <button
            type="button"
            aria-label="3. Zimmet Onayı"
            onClick={() => {
              if (folder && borrower) setStep(3);
            }}
            disabled={!folder || !borrower}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-1.5 px-3 text-xs font-medium transition-all duration-150 disabled:opacity-40",
              step === 3
                ? "bg-background text-foreground shadow-xs ring-1 ring-border/60 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                step === 3
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground",
              )}
            >
              3
            </span>
            <span className="truncate">3. Zimmet Onayı</span>
          </button>
        </div>

        {/* Step Body */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-5 py-3.5 sm:px-6 sm:py-4">
          {/* Status & Error Feedback */}
          {pending && (
            <div role="status" className="mb-2 shrink-0 flex items-center gap-2 text-xs font-medium text-primary">
              <span className="size-2 animate-ping rounded-full bg-primary" />
              Aranıyor…
            </div>
          )}

          {error && (
            <p role="alert" className="mb-2 shrink-0 rounded-xl border border-destructive/20 bg-destructive/5 p-2.5 text-xs font-medium text-destructive">
              {error}
            </p>
          )}

          {/* STEP 1: DOSYA SEÇİMİ */}
          {step === 1 && (
            <fieldset disabled={pending} className="flex flex-1 flex-col min-h-0 space-y-3">
              <legend className="sr-only">1. Fiziksel dosya seçimi</legend>

              <form
                className="flex items-end gap-2 shrink-0"
                onSubmit={(event) => {
                  event.preventDefault();
                  findFolders(1);
                }}
              >
                <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
                  Dosya başlığı
                  <div className="relative mt-1">
                    <Search
                      className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      value={folderQuery}
                      maxLength={100}
                      onChange={(event) => setFolderQuery(event.target.value)}
                      placeholder="Dosya adı veya barkod ile filtrele..."
                      className="h-9.5 pl-9 rounded-xl text-xs bg-muted/20 border-border/70 focus-visible:ring-primary/20"
                    />
                    {folderQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setFolderQuery("");
                          findFolders(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                </label>
                <button
                  type="submit"
                  className="h-9.5 rounded-xl border border-border/80 bg-secondary px-4 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 shadow-xs transition-colors disabled:opacity-50"
                >
                  Dosya ara
                </button>
              </form>

              {folder && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2 text-xs shrink-0 shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                      <Check className="size-3" aria-hidden />
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">Seçilen Dosya:</span>
                    <span className="font-mono font-bold text-foreground">{folder.barcode}</span>
                    <span className="text-muted-foreground truncate hidden sm:inline">· {folder.title}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFolder(null)}
                    className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                  >
                    <X className="size-3 mr-1" aria-hidden />
                    Seçimi Kaldır
                  </Button>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {folders.length > 0 ? (
                  <ul
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                    aria-label="Seçilebilir dosyalar"
                  >
                    {folders.map((item) => {
                      const isSelected = folder?.id === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => toggleFolder(item)}
                            aria-pressed={isSelected}
                            aria-label={`${item.barcode} · ${item.title}`}
                            className={cn(
                              "group relative flex w-full items-start justify-between gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-150",
                              isSelected
                                ? "border-primary bg-primary/[0.05] ring-1.5 ring-primary shadow-xs"
                                : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/25 hover:shadow-xs",
                            )}
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <div
                                className={cn(
                                  "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors mt-0.5",
                                  isSelected
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                                )}
                              >
                                <FolderArchive className="size-4" aria-hidden />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                    {item.barcode}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-4 border-muted-foreground/30 text-muted-foreground"
                                  >
                                    SDP {item.filePlanCode}
                                  </Badge>
                                </div>
                                <p className="mt-0.5 text-xs font-medium text-foreground/90 line-clamp-1">
                                  {item.title}
                                </p>
                                {item.locationName && (
                                  <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                                    {item.locationName}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="shrink-0 pl-1 pt-0.5">
                              {isSelected ? (
                                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                                  <Check className="size-3" aria-hidden />
                                </span>
                              ) : (
                                <span className="size-4 rounded-full border border-border group-hover:border-primary/50 block transition-colors" />
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex h-full min-h-[140px] items-center justify-center">
                    <p className="text-center text-xs text-muted-foreground">
                      Uygun dosya bulunamadı.
                    </p>
                  </div>
                )}
              </div>

              <nav
                aria-label="Dosya seçim sayfaları"
                className="mt-auto flex items-center justify-between gap-3 border-t border-border/50 pt-2 shrink-0"
              >
                <button
                  type="button"
                  className="h-8 rounded-lg border border-border/80 px-3 text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
                  disabled={folderPage <= 1}
                  onClick={() => findFolders(folderPage - 1)}
                >
                  Önceki
                </button>
                <span className="text-xs text-muted-foreground font-medium">
                  {totalFolders} dosya · Sayfa {folderPage}
                </span>
                <button
                  type="button"
                  className="h-8 rounded-lg border border-border/80 px-3 text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
                  disabled={folderPage * 25 >= totalFolders}
                  onClick={() => findFolders(folderPage + 1)}
                >
                  Sonraki
                </button>
              </nav>
            </fieldset>
          )}

          {/* STEP 2: PERSONEL SEÇİMİ */}
          {step === 2 && (
            <fieldset disabled={pending} className="flex flex-1 flex-col min-h-0 space-y-3">
              <legend className="sr-only">2. Teslim alan personel seçimi</legend>

              <form
                className="flex items-end gap-2 shrink-0"
                onSubmit={(event) => {
                  event.preventDefault();
                  findBorrowers(1);
                }}
              >
                <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
                  Kullanıcı kimliği veya birim
                  <div className="relative mt-1">
                    <User
                      className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      value={borrowerQuery}
                      maxLength={100}
                      onChange={(event) => setBorrowerQuery(event.target.value)}
                      placeholder="Personel kullanıcı adı ya da birim adı..."
                      className="h-9.5 pl-9 rounded-xl text-xs bg-muted/20 border-border/70 focus-visible:ring-primary/20"
                    />
                    {borrowerQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setBorrowerQuery("");
                          findBorrowers(1);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                      >
                        <X className="size-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                </label>
                <button
                  type="submit"
                  className="h-9.5 rounded-xl border border-border/80 bg-secondary px-4 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 shadow-xs transition-colors disabled:opacity-50"
                >
                  Personel ara
                </button>
              </form>

              {borrower && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2 text-xs shrink-0 shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                      <Check className="size-3" aria-hidden />
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">Seçilen Personel:</span>
                    <span className="font-semibold text-foreground">{borrower.subjectId}</span>
                    <span className="text-muted-foreground truncate hidden sm:inline">
                      ({borrower.unitName})
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBorrower(null)}
                    className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                  >
                    <X className="size-3 mr-1" aria-hidden />
                    Seçimi Kaldır
                  </Button>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {borrowers.length > 0 ? (
                  <ul
                    className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                    aria-label="Etkin personel"
                  >
                    {borrowers.map((item) => {
                      const isSelected = borrower?.subjectId === item.subjectId;
                      return (
                        <li key={item.subjectId}>
                          <button
                            type="button"
                            onClick={() => toggleBorrower(item)}
                            aria-pressed={isSelected}
                            aria-label={`${item.subjectId} · ${item.unitName}`}
                            className={cn(
                              "group relative flex w-full items-center justify-between gap-2.5 rounded-xl border p-2.5 text-left transition-all duration-150",
                              isSelected
                                ? "border-primary bg-primary/[0.05] ring-1.5 ring-primary shadow-xs"
                                : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/25 hover:shadow-xs",
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div
                                className={cn(
                                  "flex size-8 shrink-0 items-center justify-center rounded-lg font-bold text-xs transition-colors",
                                  isSelected
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                                )}
                              >
                                {item.subjectId.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                    {item.subjectId}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 shrink-0"
                                  >
                                    Etkin Personel
                                  </Badge>
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                                  {item.unitName}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0 pl-1">
                              {isSelected ? (
                                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                                  <Check className="size-3" aria-hidden />
                                </span>
                              ) : (
                                <span className="size-4 rounded-full border border-border group-hover:border-primary/50 block transition-colors" />
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : !searched ? (
                  <div className="flex h-full min-h-[140px] items-center justify-center p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      Personel aramak için yukarıdaki kutuya isim/birim yazıp &ldquo;Personel ara&rdquo; düğmesine basın.
                    </p>
                  </div>
                ) : !error ? (
                  <div className="flex h-full min-h-[140px] items-center justify-center p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      Etkin birime kayıtlı personel bulunamadı. Birim üyeliklerini kontrol edin.
                    </p>
                  </div>
                ) : null}
              </div>

              {searched && (
                <nav
                  aria-label="Personel seçim sayfaları"
                  className="mt-auto flex items-center justify-between gap-3 border-t border-border/50 pt-2 shrink-0"
                >
                  <button
                    type="button"
                    className="h-8 rounded-lg border border-border/80 px-3 text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
                    disabled={borrowerPage <= 1}
                    onClick={() => findBorrowers(borrowerPage - 1)}
                  >
                    Önceki
                  </button>
                  <span className="text-xs text-muted-foreground font-medium">
                    {borrowerTotal} kişi · Sayfa {borrowerPage}
                  </span>
                  <button
                    type="button"
                    className="h-8 rounded-lg border border-border/80 px-3 text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
                    disabled={borrowerPage * 25 >= borrowerTotal}
                    onClick={() => findBorrowers(borrowerPage + 1)}
                  >
                    Sonraki
                  </button>
                </nav>
              )}
            </fieldset>
          )}

          {/* STEP 3: ZİMMET DETAYLARI & ONAY */}
          {step === 3 && folder && borrower && (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <ActionForm
                action={handleCheckout}
                label="Ödünç kaydını oluştur"
                submitClassName="mt-6 sm:mt-7 h-10 w-full rounded-xl text-xs font-semibold shadow-xs hover:bg-primary/90 transition-all"
                onSuccess={() => {
                  handleReset();
                  setOpen(false);
                }}
              >
                <input type="hidden" name="folderId" value={folder.id} />
                <input
                  type="hidden"
                  name="borrowerSubjectId"
                  value={borrower.subjectId}
                />

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
                  {/* Sol Kolon: Seçilenler & Bilgilendirme */}
                  <div className="md:col-span-5 space-y-2.5">
                    <div className="rounded-xl border border-border/70 bg-card p-3 space-y-1.5 text-xs shadow-xs">
                      <div className="flex items-center justify-between text-muted-foreground gap-2">
                        <span className="flex items-center gap-1.5 font-semibold text-foreground whitespace-nowrap">
                          <FolderArchive className="size-3.5 text-primary shrink-0" aria-hidden />
                          Fiziksel Dosya
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-[11px] text-primary hover:underline font-medium shrink-0"
                        >
                          Değiştir
                        </button>
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-mono font-bold text-foreground text-xs">
                          {folder.barcode}
                        </p>
                        <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed font-medium">
                          {folder.title}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-muted-foreground/30 shrink-0">
                          SDP {folder.filePlanCode}
                        </Badge>
                        {folder.locationName && (
                          <span className="truncate">· {folder.locationName}</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/70 bg-card p-3 space-y-1.5 text-xs shadow-xs">
                      <div className="flex items-center justify-between text-muted-foreground gap-2">
                        <span className="flex items-center gap-1.5 font-semibold text-foreground whitespace-nowrap">
                          <User className="size-3.5 text-primary shrink-0" aria-hidden />
                          Teslim Alan Personel
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-[11px] text-primary hover:underline font-medium shrink-0"
                        >
                          Değiştir
                        </button>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary text-xs">
                          {borrower.subjectId.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground text-xs truncate">
                              {borrower.subjectId}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 shrink-0"
                            >
                              Etkin Personel
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {borrower.unitName}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs space-y-1 text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-semibold text-primary whitespace-nowrap">
                        <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                        <span className="text-[11px]">Resmi Zimmet Tutanak Bilgisi</span>
                      </div>
                      <p className="text-[10.5px] leading-relaxed">
                        İşlem tamamlandığında, kurum üst bilgili resmi teslim tutanağı otomatik açılacaktır.
                      </p>
                    </div>
                  </div>

                  {/* Sağ Kolon: Form Girdileri */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="loan-purpose"
                          className="text-xs font-semibold text-foreground whitespace-nowrap"
                        >
                          Zimmet Gerekçesi
                        </label>
                        <span className="text-[10.5px] text-muted-foreground whitespace-nowrap">
                          Resmi tutanağa işlenir
                        </span>
                      </div>
                      <textarea
                        id="loan-purpose"
                        name="purpose"
                        required
                        maxLength={1000}
                        rows={3}
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="Dosyanın teslim edilme gerekçesi veya resmi yazı referansı..."
                        className="block w-full rounded-xl border border-input bg-background p-2.5 text-xs leading-relaxed placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                      />
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap mr-0.5">Şablonlar:</span>
                        {QUICK_PURPOSES.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setPurpose(item)}
                            className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10.5px] text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all whitespace-nowrap"
                          >
                            + {item}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="loan-due-at"
                          className="text-xs font-semibold text-foreground whitespace-nowrap"
                        >
                          Son İade Tarihi
                        </label>
                        <span className="text-[10.5px] text-muted-foreground whitespace-nowrap">
                          Gün sonu (23:59) geçerlidir
                        </span>
                      </div>
                      <Input
                        id="loan-due-at"
                        name="dueAt"
                        type="date"
                        required
                        min={todayStr}
                        value={dueAt}
                        onChange={(e) => setDueAt(e.target.value)}
                        className="h-9 rounded-xl bg-background text-xs"
                      />
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap mr-0.5">Hızlı Süre:</span>
                        {DURATION_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              const target = new Date(
                                Date.now() + preset.days * 86400000,
                              );
                              setDueAt(target.toISOString().split("T")[0]);
                            }}
                            className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[10.5px] text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all whitespace-nowrap"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </ActionForm>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="border-t border-border/60 bg-muted/25 px-5 py-3 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {step === 1 && (
              <span className="text-xs text-muted-foreground">
                {folder ? `Seçildi: ${folder.barcode}` : "Lütfen ödünç verilecek dosyayı seçin"}
              </span>
            )}
            {step === 2 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="h-8 gap-1.5 text-xs rounded-lg"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                <span>1. Dosya Seçimi</span>
              </Button>
            )}
            {step === 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep(2)}
                className="h-8 gap-1.5 text-xs rounded-lg"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                <span>2. Personel Seçimi</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(folder || borrower) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs text-muted-foreground hover:text-foreground rounded-lg"
              >
                <RotateCcw className="size-3 mr-1" aria-hidden />
                Sıfırla
              </Button>
            )}

            {step === 1 && (
              <Button
                type="button"
                size="sm"
                disabled={!folder}
                onClick={() => setStep(2)}
                className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 rounded-lg shadow-xs"
              >
                <span>Personel Seçimi</span>
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            )}

            {step === 2 && (
              <Button
                type="button"
                size="sm"
                disabled={!borrower}
                onClick={() => setStep(3)}
                className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 rounded-lg shadow-xs"
              >
                <span>Zimmet Onayı</span>
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
