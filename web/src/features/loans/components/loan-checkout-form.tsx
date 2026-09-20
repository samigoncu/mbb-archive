"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Check,
  RotateCcw,
  BookOpenCheck,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { LoanFolderStep } from "./loan-folder-step";
import { LoanBorrowerStep } from "./loan-borrower-step";
import { LoanConfirmStep } from "./loan-confirm-step";

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
          {pending && (
            <div
              role="status"
              className="mb-2 shrink-0 flex items-center gap-2 text-xs font-medium text-primary"
            >
              <span className="size-2 animate-ping rounded-full bg-primary" />
              Aranıyor…
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="mb-2 shrink-0 rounded-xl border border-destructive/20 bg-destructive/5 p-2.5 text-xs font-medium text-destructive"
            >
              {error}
            </p>
          )}

          {step === 1 && (
            <LoanFolderStep
              folder={folder}
              folders={folders}
              totalFolders={totalFolders}
              folderPage={folderPage}
              folderQuery={folderQuery}
              pending={pending}
              onFolderQueryChange={setFolderQuery}
              onSearch={findFolders}
              onSelectFolder={toggleFolder}
              onClearFolder={() => setFolder(null)}
              onPageChange={findFolders}
            />
          )}

          {step === 2 && (
            <LoanBorrowerStep
              borrower={borrower}
              borrowers={borrowers}
              borrowerTotal={borrowerTotal}
              borrowerPage={borrowerPage}
              borrowerQuery={borrowerQuery}
              searched={searched}
              error={error}
              pending={pending}
              onBorrowerQueryChange={setBorrowerQuery}
              onSearch={findBorrowers}
              onSelectBorrower={toggleBorrower}
              onClearBorrower={() => setBorrower(null)}
              onPageChange={findBorrowers}
            />
          )}

          {step === 3 && folder && borrower && (
            <LoanConfirmStep
              folder={folder}
              borrower={borrower}
              purpose={purpose}
              onPurposeChange={setPurpose}
              dueAt={dueAt}
              onDueAtChange={setDueAt}
              todayStr={todayStr}
              onStepChange={setStep}
              handleCheckout={handleCheckout}
              onSuccess={() => {
                handleReset();
                setOpen(false);
              }}
            />
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
