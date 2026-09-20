"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  FileText,
  User,
  Check,
  RotateCcw,
  X,
  ArrowRight,
  ArrowLeft,
  Clock,
  ShieldCheck,
  ClipboardPlus,
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
import {
  findTaskDocuments,
  getTaskAssignees,
  assignTaskAction,
} from "../api/assignment-actions";
import { cn } from "@/lib/utils";

const QUICK_TASK_TITLES = [
  "Belge üstverisini kontrol edin",
  "Onay ve paraf incelemesi",
  "Fiziksel arşiv ve kopya kontrolü",
  "Mevzuata uygunluk incelemesi",
  "İmza ve mühür doğrulama",
];

const SLA_PRESETS = [
  { label: "1 Gün (24 sa)", minutes: 1440 },
  { label: "2 Gün", minutes: 2880 },
  { label: "3 Gün", minutes: 4320 },
  { label: "1 Hafta (7 gün)", minutes: 10080 },
];

type DocItem = {
  id: string;
  title: string;
  status?: string;
};

export function TaskCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Document selection
  const [docSearch, setDocSearch] = useState("");
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [searchedDocs, setSearchedDocs] = useState(false);

  // Step 2: Task details & assignee
  const [taskTitle, setTaskTitle] = useState("");
  const [slaMinutes, setSlaMinutes] = useState(1440);
  const [candidates, setCandidates] = useState<{ subjectId: string; unitName: string }[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState("");

  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // Load assignees whenever selected document changes
  useEffect(() => {
    let active = true;
    setCandidates([]);
    setSelectedSubjectId("");
    setCandidatesError("");

    if (selectedDoc) {
      setCandidatesLoading(true);
      getTaskAssignees(selectedDoc.id).then((result) => {
        if (active) {
          setCandidates(result.items || []);
          setCandidatesError(result.error ?? "");
          setCandidatesLoading(false);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [selectedDoc]);

  // Initial document search on first open if empty
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && documents.length === 0) {
      searchDocs("");
    }
    if (!isOpen) {
      handleReset();
    }
  };

  const searchDocs = (query: string) => {
    startTransition(async () => {
      setError("");
      const result = await findTaskDocuments(query);
      if (result.items) {
        setDocuments(result.items);
        setSearchedDocs(true);
      } else {
        setError(result.error ?? "Belgeler yüklenemedi.");
      }
    });
  };

  const handleReset = () => {
    setSelectedDoc(null);
    setTaskTitle("");
    setSlaMinutes(1440);
    setSelectedSubjectId("");
    setStep(1);
    setError("");
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
        <span>Yeni görev oluştur</span>
      </DialogTrigger>

      <DialogContent className="flex h-[640px] max-h-[90vh] w-[95vw] sm:max-w-none sm:w-[680px] md:w-[760px] lg:w-[820px] flex-col gap-0 overflow-hidden p-0 rounded-2xl border border-border/80 shadow-2xl bg-card">
        {/* Header */}
        <DialogHeader className="border-b border-border/60 bg-gradient-to-b from-muted/30 to-transparent px-6 py-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs shrink-0">
              <ClipboardPlus className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold tracking-tight">
                  Yeni Görev Oluştur ve Ata
                </DialogTitle>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20">
                  Adım {step} / 2
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                İş akışı için ilgili belgeyi seçin, görev ayrıntılarını ve personeli belirleyin.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-2 gap-1.5 border-b border-border/50 bg-muted/30 p-1.5 shrink-0">
          <button
            type="button"
            aria-label="1. Belge Seçimi"
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
                selectedDoc
                  ? "bg-emerald-500 text-white shadow-xs"
                  : step === 1
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {selectedDoc ? <Check className="size-3" aria-hidden /> : "1"}
            </span>
            <span className="truncate">
              {selectedDoc ? selectedDoc.title : "1. Belge Seçimi"}
            </span>
          </button>

          <button
            type="button"
            aria-label="2. Görev ve Personel Detayları"
            onClick={() => {
              if (selectedDoc) setStep(2);
            }}
            disabled={!selectedDoc}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-1.5 px-3 text-xs font-medium transition-all duration-150 disabled:opacity-40",
              step === 2
                ? "bg-background text-foreground shadow-xs ring-1 ring-border/60 font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors",
                step === 2
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground",
              )}
            >
              2
            </span>
            <span className="truncate">2. Görev ve Personel</span>
          </button>
        </div>

        {/* Step Body */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-5 py-3.5 sm:px-6 sm:py-4">
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

          {/* STEP 1: BELGE SEÇİMİ */}
          {step === 1 && (
            <fieldset disabled={pending} className="flex flex-1 flex-col min-h-0 space-y-3">
              <legend className="sr-only">1. İlgili belge seçimi</legend>

              <form
                className="flex items-end gap-2 shrink-0"
                onSubmit={(e) => {
                  e.preventDefault();
                  searchDocs(docSearch);
                }}
              >
                <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
                  Görev için belge ara
                  <div className="relative mt-1">
                    <Search
                      className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      value={docSearch}
                      maxLength={100}
                      onChange={(e) => setDocSearch(e.target.value)}
                      placeholder="Belge başlığı veya konu ile filtrele..."
                      className="h-9.5 pl-9 rounded-xl text-xs bg-muted/20 border-border/70 focus-visible:ring-primary/20"
                    />
                    {docSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setDocSearch("");
                          searchDocs("");
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
                  Belge ara
                </button>
              </form>

              {selectedDoc && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-2 text-xs shrink-0 shadow-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shrink-0">
                      <Check className="size-3" aria-hidden />
                    </span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">Seçilen Belge:</span>
                    <span className="font-medium text-foreground truncate">{selectedDoc.title}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDoc(null)}
                    className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                  >
                    <X className="size-3 mr-1" aria-hidden />
                    Seçimi Kaldır
                  </Button>
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {documents.length > 0 ? (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Seçilebilir belgeler">
                    {documents.map((item) => {
                      const isSelected = selectedDoc?.id === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedDoc(isSelected ? null : item)}
                            aria-pressed={isSelected}
                            aria-label={item.title}
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
                                <FileText className="size-4" aria-hidden />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                                  {item.title}
                                </p>
                                {item.status && (
                                  <div className="mt-1">
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-muted-foreground/30 text-muted-foreground">
                                      {item.status}
                                    </Badge>
                                  </div>
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
                ) : searchedDocs ? (
                  <div className="flex h-full min-h-[140px] items-center justify-center">
                    <p className="text-center text-xs text-muted-foreground">
                      Aramaya uygun belge bulunamadı.
                    </p>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[140px] items-center justify-center">
                    <p className="text-center text-xs text-muted-foreground">
                      Görev atanacak belgeyi aramak için yukarıdaki kutuyu kullanın.
                    </p>
                  </div>
                )}
              </div>
            </fieldset>
          )}

          {/* STEP 2: GÖREV DETAYLARI & PERSONEL ATAMA */}
          {step === 2 && selectedDoc && (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <ActionForm
                action={assignTaskAction}
                label="Görevi oluştur ve ata"
                submitClassName="mt-6 sm:mt-7 h-10 w-full rounded-xl text-xs font-semibold shadow-xs hover:bg-primary/90 transition-all"
                onSuccess={() => {
                  handleReset();
                  setOpen(false);
                  router.refresh();
                }}
              >
                <input type="hidden" name="documentId" value={selectedDoc.id} />

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
                  {/* Sol Kolon: Seçilen Belge & Bilgilendirme */}
                  <div className="md:col-span-5 space-y-2.5">
                    <div className="rounded-xl border border-border/70 bg-card p-3 space-y-1.5 text-xs shadow-xs">
                      <div className="flex items-center justify-between text-muted-foreground gap-2">
                        <span className="flex items-center gap-1.5 font-semibold text-foreground whitespace-nowrap">
                          <FileText className="size-3.5 text-primary shrink-0" aria-hidden />
                          İlgili Belge
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep(1)}
                          className="text-[11px] text-primary hover:underline font-medium shrink-0"
                        >
                          Değiştir
                        </button>
                      </div>
                      <p className="text-xs text-foreground/90 font-medium line-clamp-3 leading-relaxed">
                        {selectedDoc.title}
                      </p>
                    </div>

                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-xs space-y-1 text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-semibold text-primary whitespace-nowrap">
                        <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
                        <span className="text-[11px]">Birim Yetki Kuralı</span>
                      </div>
                      <p className="text-[10.5px] leading-relaxed">
                        Yalnızca belgenin ait olduğu birimdeki, iş akışı okuma ve tamamlama yetkisine sahip personeller listelenir.
                      </p>
                    </div>
                  </div>

                  {/* Sağ Kolon: Görev Formu */}
                  <div className="md:col-span-7 space-y-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="task-title"
                        className="text-xs font-semibold text-foreground whitespace-nowrap"
                      >
                        Görev Başlığı
                      </label>
                      <Input
                        id="task-title"
                        name="title"
                        required
                        maxLength={300}
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="Örn: Belge üstverisini ve eklerini kontrol edin..."
                        className="h-9.5 rounded-xl bg-background text-xs"
                      />
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap mr-0.5">Şablonlar:</span>
                        {QUICK_TASK_TITLES.map((title) => (
                          <button
                            key={title}
                            type="button"
                            onClick={() => setTaskTitle(title)}
                            className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[10.5px] text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all whitespace-nowrap"
                          >
                            + {title}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="task-sla"
                          className="text-xs font-semibold text-foreground whitespace-nowrap"
                        >
                          Tamamlama Süresi (Dakika)
                        </label>
                        <span className="text-[10.5px] text-muted-foreground whitespace-nowrap">
                          {Math.round(slaMinutes / 60)} saat / {(slaMinutes / 1440).toFixed(1)} gün
                        </span>
                      </div>
                      <Input
                        id="task-sla"
                        name="slaMinutes"
                        type="number"
                        required
                        min={1}
                        max={525600}
                        value={slaMinutes}
                        onChange={(e) => setSlaMinutes(Number(e.target.value))}
                        className="h-9 rounded-xl bg-background text-xs"
                      />
                      <div className="flex flex-wrap items-center gap-1 pt-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap mr-0.5">Hızlı Süre:</span>
                        {SLA_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setSlaMinutes(preset.minutes)}
                            className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[10.5px] text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all whitespace-nowrap"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="task-subjectId"
                        className="text-xs font-semibold text-foreground whitespace-nowrap"
                      >
                        Atanacak Personel
                      </label>
                      <select
                        id="task-subjectId"
                        name="subjectId"
                        required
                        disabled={candidatesLoading || !candidates.length}
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="h-9.5 w-full rounded-xl border border-input bg-background px-3 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                      >
                        <option value="">
                          {candidatesLoading
                            ? "Yetkili personel listesi yükleniyor…"
                            : candidates.length === 0
                              ? "Atanabilecek yetkili personel bulunamadı"
                              : "Personel seçin..."}
                        </option>
                        {candidates.map((c) => (
                          <option key={c.subjectId} value={c.subjectId}>
                            {c.subjectId} · {c.unitName}
                          </option>
                        ))}
                      </select>
                      {candidatesError && (
                        <p role="alert" className="text-xs text-destructive mt-1">
                          {candidatesError}
                        </p>
                      )}
                      {!candidatesLoading && !candidatesError && !candidates.length && (
                        <p role="status" className="text-xs text-muted-foreground mt-1">
                          Bu belgenin biriminde atanabilecek yetkili personel bulunamadı.
                        </p>
                      )}
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
                {selectedDoc ? `Seçildi: ${selectedDoc.title}` : "Lütfen görev atanacak belgeyi seçin"}
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
                <span>1. Belge Seçimi</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedDoc && (
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
                disabled={!selectedDoc}
                onClick={() => setStep(2)}
                className="h-8 gap-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 rounded-lg shadow-xs"
              >
                <span>Görev & Personel</span>
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

