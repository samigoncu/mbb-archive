"use client";

import { ScanFileQueue, ScanPreview, formatFileSize } from "./scan-file-workspace";
import { uploadSizeError } from "../model/upload-size";
import { useScanContext } from "../model/use-scan-context";
import { documentUploadAccept, isOfficeFile } from "@/features/documents/model/office-formats";
import { validateScanSelection } from "../model/scan-context";
import { ScanFilingFields } from "./scan-filing-fields";
import { NetworkScanner } from "./network-scanner";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  AlertTriangle,
  Camera,
  Eye,
  Gavel,
  MapPin,
  Pentagon,
  Shapes,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { uploadScannedDocumentAction } from "@/features/scanning/api/stream-upload";
import { GeoPointPickerDialog } from "@/features/geo/components/geo-point-picker-dialog";
import { PostUploadDeclareDialog } from "@/features/archive/components/post-upload-declare-dialog";
import {
  parseFieldOptions,
  type MetadataFieldDefinition,
  type MetadataSchemaDetail,
} from "@/features/classification/model/classification";
import {
  buildMetadataPayload,
  multiChoiceSeparator,
} from "@/features/scanning/model/metadata-payload";
import {
  suggestDocumentSubject,
  buildSubjectChips,
  isGenericScannerFilename,
  detectSemanticSubjectFromKeywords,
  generateStandardArchiveFilename,
  renameScannedFile,
  formatFilenameToTitle,
} from "../model/scan-subject-suggester";

const documentStatusLabels: Record<string, string> = {
  Draft: "Taslak",
  Active: "Aktif",
  Archived: "Arşivlendi",
};

export type ScannedPage = {
  id: string;
  file: File;
  previewUrl: string;
  isPdf: boolean;
  isOffice: boolean;
  /** Yalnız görsellerde; yüklemeden önce dosyaya işlenir. */
  rotation: number;
  /** Ayraç / Yeni Belge Başlangıcı */
  isSeparator?: boolean;
  /** Otomatik veya manuel ayrılmış belge grubu (1, 2, 3...) */
  documentGroup?: number;
};

export function ScanIndexingStudio({
  units, initialContext, initialDossierId, initialFolderId, metadataSchemas, maxUploadBytes = 200 * 1024 * 1024,
}: {
  units: import("@/features/dossiers/model/dossier").ArchiveUnit[];
  initialContext: import("../model/scan-context").ScanContext;
  initialDossierId?: string;
  initialFolderId?: string;
  metadataSchemas: MetadataSchemaDetail[];
  maxUploadBytes?: number;
}) {
  const scope = useScanContext(initialContext, initialDossierId, initialFolderId);
  const { ownerUnitId, dossier, folderId, classification } = scope;
  const recentDocuments = scope.context.recentDocuments;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "progress" | "success"; message: string; documentId?: string } | null>(null);
  const [receipts, setReceipts] = useState<{ id: string; title: string; warnings: string[] }[]>([]);
  const [activeDeclareDoc, setActiveDeclareDoc] = useState<{ id: string; title: string } | null>(null);
  function reportError(message: string, documentId?: string) {
    setFeedback({ kind: "error", message, documentId });
    toast.error(message, { id: "scan-save" });
  }

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const [subject, setSubject] = useState("");

  // Tek yayınlanmış şema varsa doğrudan seçilir; aksi halde operatör seçer.
  const [metadataSchemaId, setMetadataSchemaId] = useState(
    metadataSchemas.length === 1 ? metadataSchemas[0].id : "",
  );
  const [metadataValues, setMetadataValues] = useState<Record<string, string>>(
    {},
  );

  const activeSchema =
    metadataSchemas.find((schema) => schema.id === metadataSchemaId) ?? null;

  const selectedPage = pages[selectedIndex] ?? pages[0];
  const distinctGroups = Array.from(new Set(pages.map((p) => p.documentGroup ?? 1)));

  const subjectChips = buildSubjectChips({
    classificationTitle: classification?.title,
    dossierTitle: dossier?.title,
  });

  async function triggerSubjectSuggestion() {
    const fileToInspect = selectedPage?.file ?? pages[0]?.file;
    if (!fileToInspect) return;
    const res = await suggestDocumentSubject({
      file: fileToInspect,
      classificationTitle: classification?.title,
      classificationCode: classification?.code,
      dossierTitle: dossier?.title,
      unitName: units.find((u) => u.id === ownerUnitId)?.name,
    });
    setSubject(res.subject);
    if (res.suggestedFilename && selectedPage) {
      setPages((prev) =>
        prev.map((p) =>
          p.id === selectedPage.id
            ? { ...p, file: renameScannedFile(p.file, res.suggestedFilename!) }
            : p,
        ),
      );
    }
    if (res.source === "content") {
      toast.success(`Belge içeriğinden tespit edildi: "${res.subject}"`);
    } else if (res.source === "semantic") {
      toast.success(`Dosya ilişkisi tespit edildi: "${res.subject}"`);
    } else if (res.source === "classification") {
      toast.success(`SDP konusuna göre önerildi: "${res.subject}"`);
    } else {
      toast.success(`Önerilen başlık uygulandı: "${res.subject}"`);
    }
  }

  function renamePageFile(index: number, newName: string) {
    if (!newName.trim()) return;
    setPages((prev) =>
      prev.map((page, i) => {
        if (i !== index) return page;
        const extMatch = page.file.name.match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? `.${extMatch[1]}` : "";
        let finalName = newName.trim();
        if (ext && !finalName.toLowerCase().endsWith(ext.toLowerCase())) {
          finalName += ext;
        }
        return {
          ...page,
          file: renameScannedFile(page.file, finalName),
        };
      }),
    );
  }

  function syncFilenameWithSubject() {
    if (!selectedPage || !subject.trim()) return;
    const newFilename = generateStandardArchiveFilename(
      subject.trim(),
      selectedPage.file.name,
      classification?.code,
    );
    renamePageFile(selectedIndex, newFilename);
    toast.success(`Dosya adı güncellendi: ${newFilename}`);
  }

  function recalculateGroups(list: ScannedPage[]): ScannedPage[] {
    let currentGroup = 1;
    return list.map((page, index) => {
      if (page.isSeparator && index > 0) {
        currentGroup++;
      }
      return { ...page, documentGroup: currentGroup };
    });
  }

  function addFiles(fileList: FileList | File[]) {
    if (isSubmitting) return;
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    const newPages: ScannedPage[] = incoming.map((file, index) => {
      const isSep = /ayrac|separator|patch|barkod|sep|ayirici/i.test(file.name);

      // Semantik anahtar kelime eşleşmesi (örn: "ADSL ekim.pdf", "maski_su_ekim.pdf")
      const semanticSubject = detectSemanticSubjectFromKeywords(file.name);
      let pageFile = file;
      if (semanticSubject) {
        const standardFilename = generateStandardArchiveFilename(
          semanticSubject,
          file.name,
          classification?.code,
        );
        pageFile = renameScannedFile(file, standardFilename);
      }

      return {
        id: `${Date.now()}-${index}-${pageFile.name}`,
        file: pageFile,
        previewUrl: URL.createObjectURL(pageFile),
        isPdf:
          pageFile.type === "application/pdf" ||
          pageFile.name.toLowerCase().endsWith(".pdf"),
        rotation: 0,
        isOffice: isOfficeFile(pageFile),
        isSeparator: isSep,
      };
    });

    setPages((prev) => {
      const next = recalculateGroups([...prev, ...newPages]);
      setSelectedIndex(prev.length);
      return next;
    });

    // Senkron başlangıç değeri (anında submit ve UI tutarlılığı için)
    const firstSemantic = detectSemanticSubjectFromKeywords(incoming[0].name);
    const rawName = incoming[0].name.replace(/\.[^/.]+$/, "");
    const initialSyncSubject = firstSemantic
      ?? (isGenericScannerFilename(incoming[0].name)
          ? (classification?.title
              ? `${classification.title} Evrakı`
              : (dossier?.title ? `${dossier.title} Üst Yazısı` : rawName))
          : rawName);

    setSubject((current) =>
      current.trim().length > 0 ? current : initialSyncSubject,
    );

    // Asenkron analiz: PDF gömülü metninden Konu:, Karar No, Dilekçe tespiti
    const firstFile = newPages[0].file;
    void suggestDocumentSubject({
      file: firstFile,
      classificationTitle: classification?.title,
      classificationCode: classification?.code,
      dossierTitle: dossier?.title,
      unitName: units.find((u) => u.id === ownerUnitId)?.name,
    }).then((suggestion) => {
      if (suggestion.source === "content" || suggestion.source === "semantic") {
        setSubject(suggestion.subject);
        if (suggestion.source === "content") {
          toast.info(`Belge içeriğinden konu tespit edildi: "${suggestion.subject}"`);
        } else {
          toast.info(`Dosya adından ilişki tespit edildi: "${suggestion.subject}"`);
        }
      }
      if (suggestion.suggestedFilename) {
        const targetId = newPages[0].id;
        setPages((prev) =>
          prev.map((p) =>
            p.id === targetId && (suggestion.source === "content" || suggestion.source === "semantic" || isGenericScannerFilename(incoming[0].name))
              ? { ...p, file: renameScannedFile(p.file, suggestion.suggestedFilename!) }
              : p,
          ),
        );
      }
    });
  }

  function toggleSeparator(index: number) {
    setPages((prev) => {
      const updated = prev.map((p, i) => (i === index ? { ...p, isSeparator: !p.isSeparator } : p));
      return recalculateGroups(updated);
    });
  }

  function autoDetectSeparators() {
    const updated = pages.map((page, index) => index > 0 && /ayrac|separator|patch|barkod|sep|ayirici/i.test(page.file.name)
      ? { ...page, isSeparator: true } : page);
    const detected = updated.filter((page, index) => index > 0 && /ayrac|separator|patch|barkod|sep|ayirici/i.test(page.file.name)).length;
    setPages(recalculateGroups(updated));
    if (detected > 0) {
      toast.success(`${detected} ayraç dosyası bulundu ve belgeler gruplandı.`);
    } else {
      toast.info("Dosya adlarında ayraç kalıbı bulunamadı. Dosyanın makas düğmesiyle elle ayırabilirsiniz.");
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
    }
  }

  function removePage(index: number) {
    setPages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      const next = prev.filter((_, i) => i !== index);
      setSelectedIndex((current) =>
        Math.max(0, Math.min(current, next.length - 1)),
      );
      return recalculateGroups(next);
    });
  }

  function rotatePage(index: number) {
    setPages((prev) =>
      prev.map((page, i) =>
        i === index ? { ...page, rotation: (page.rotation + 90) % 360 } : page,
      ),
    );
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast.error("Kameraya erişilemedi. Tarayıcı izinlerini kontrol edin.");
    }
  }

  function stopCamera() {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
  }

  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `tarama-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        addFiles([file]);
        stopCamera();
      },
      "image/jpeg",
      0.92,
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    if (pages.length === 0) {
      reportError("Önce en az bir dosya seçin veya kameradan çekim yapın.");
      return;
    }

    const sizeError = uploadSizeError(pages.map(page => page.file), maxUploadBytes);
    if (sizeError) { reportError(sizeError); return; }

    if (!ownerUnitId || scope.loading || scope.error) {
      reportError("Önce yetkili olduğunuz birimin dosyalarını yükleyin."); return;
    }
    const selectionError = validateScanSelection(scope.context, { folderId, dossierId: dossier?.id ?? "",
      filePlanId: classification?.planId ?? "", filePlanItemId: classification?.itemId ?? "" });
    if (selectionError) { reportError(selectionError); return; }
    setFeedback({ kind: "progress", message: "Dosyalar aktarım için hazırlanıyor…" });
    setIsSubmitting(true);
    toast.loading("Dosyalar yükleniyor…", { id: "scan-save" });

    try {
      const typed = activeSchema ? buildMetadataPayload(activeSchema, metadataValues) : null;
      if (typed?.error) {
        reportError(typed.error);
        return;
      }
      const groupNumbers = Array.from(new Set(pages.map(p => p.documentGroup ?? 1))).sort((a, b) => a - b);
      const allWarnings: string[] = [];
      const newUploadedReceipts: { id: string; title: string; warnings: string[] }[] = [];

      for (const groupNum of groupNumbers) {
        setFeedback({ kind: "progress", message: `Belge grubu ${groupNumbers.indexOf(groupNum) + 1} / ${groupNumbers.length} aktarılıyor…` });
        const groupPages = pages.filter(p => (p.documentGroup ?? 1) === groupNum);
        const nonSeparatorPages = groupPages.filter(p => !p.isSeparator);
        const pagesToUpload = nonSeparatorPages.length > 0 ? nonSeparatorPages : groupPages;
        const formData = new FormData();
        formData.append("title", groupNumbers.length > 1 ? `${subject.trim()} (Belge ${groupNum})` : subject.trim());
        formData.append("ownerUnitId", ownerUnitId);
        if (dossier) formData.append("dossierId", dossier.id);
        if (folderId) formData.append("folderId", folderId);
        if (classification) {
          formData.append("filePlanId", classification.planId);
          formData.append("filePlanItemId", classification.itemId);
        }
        if (activeSchema && typed) {
          formData.append("metadataSchemaId", activeSchema.id);
          formData.append("metadataValues", JSON.stringify(typed.values));
        }
        for (const page of pagesToUpload) {
          formData.append("files", await applyRotation(page));
        }
        const preparedSizeError = uploadSizeError(formData.getAll("files").filter((file): file is File => file instanceof File), maxUploadBytes);
        if (preparedSizeError) { reportError(preparedSizeError); return; }
        const result = await uploadScannedDocumentAction(formData);
        if (!result.success) {
          reportError(groupNumbers.length > 1 ? `Belge ${groupNum} aktarılırken hata: ${result.message}` : result.message, result.documentId);
          return;
        }
        if (result.documentId) {
          const item = { id: result.documentId!, title: String(formData.get("title")), warnings: result.warnings ?? [] };
          newUploadedReceipts.push(item);
          setReceipts(current => [...current, item]);
        }
        // Başarılı grupları hemen çıkar; sonraki grup başarısız olursa tekrar yüklenmesin.
        const uploadedIds = new Set(groupPages.map(page => page.id));
        groupPages.forEach(page => URL.revokeObjectURL(page.previewUrl));
        setPages(current => current.filter(page => !uploadedIds.has(page.id)));
        if (result.warnings) allWarnings.push(...result.warnings);
      }

      toast.success("Belgeler hazırlık alanına yüklendi. Güvenlik taraması kuyruğuna alındı.", {
        id: "scan-save", duration: 6000,
      });
      allWarnings.forEach(warning => toast.warning(warning));
      setFeedback({ kind: "success", message: "Aktarım tamamlandı. Güvenlik taraması ve OCR sonucunu işlem takibinden izleyebilirsiniz." });

      // İlk yüklenen belgeyi beyan diyalogu için hazırla
      if (newUploadedReceipts.length > 0) {
        setActiveDeclareDoc({ id: newUploadedReceipts[0].id, title: newUploadedReceipts[0].title });
      }

      setPages([]);
      setSelectedIndex(0);
      setSubject("");
      setMetadataValues({});
      await scope.refresh();
    } catch {
      reportError("Yükleme sırasında bağlantı hatası oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalBytes = pages.reduce((total, page) => total + page.file.size, 0);
  const selectedUnit = units.find(unit => unit.id === ownerUnitId);
  const sizeIssue = uploadSizeError(pages.map(page => page.file), maxUploadBytes);
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <input type="file" aria-label="Yüklenecek dosyalar" ref={fileInputRef} disabled={isSubmitting} onChange={event => {
        if (event.target.files) addFiles(event.target.files); event.target.value = "";
      }} multiple accept={documentUploadAccept} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {feedback && <div role={feedback.kind === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${feedback.kind === "error" ? "border-destructive/25 bg-destructive/5" : "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30"}`}>
        {feedback.kind === "error" ? <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden /> : <Activity className="mt-0.5 size-5 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />}
        <div className="min-w-0 flex-1"><p className="font-medium">{feedback.message}</p>{feedback.documentId && <Link href={`/documents/${feedback.documentId}`} className="mt-2 inline-block underline">Oluşan belge kaydını kontrol et</Link>}</div>
      </div>}
      {receipts.length > 0 && <section aria-label="Aktarılan belgeler" className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Aktarım kayıtları</h2><Link href="/islem-takibi" className="inline-flex items-center gap-1 text-sm font-medium underline">OCR ve işlem takibi<ArrowUpRight className="size-4" aria-hidden /></Link></div>
        <p className="mt-1 text-sm text-muted-foreground">Dosyalar sunucuya aktarıldı. Güvenlik taraması ve OCR sonucu ayrıca takip edilir. İsterseniz bu evrakları şimdi kurumsal kayıt olarak beyan edebilirsiniz.</p>
        <ul className="mt-3 space-y-2">{receipts.map(receipt => (
          <li key={receipt.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
            <span className="break-words text-sm font-medium">{receipt.title}</span>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 gap-1 border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                onClick={() => setActiveDeclareDoc({ id: receipt.id, title: receipt.title })}
              >
                <Gavel className="size-3.5" aria-hidden />
                Beyan Et
              </Button>
              <Link href={`/documents/${receipt.id}`} className="inline-flex items-center gap-1 text-sm text-sky-700 hover:underline dark:text-sky-300">Belgeyi aç<ArrowUpRight className="size-4" aria-hidden /></Link>
            </div>
            {receipt.warnings.map(warning => <p key={warning} className="w-full text-sm text-amber-800 dark:text-amber-200">{warning}</p>)}
          </li>
        ))}</ul>
      </section>}

      {activeDeclareDoc && (
        <PostUploadDeclareDialog
          isOpen={!!activeDeclareDoc}
          onOpenChange={(open) => {
            if (!open) setActiveDeclareDoc(null);
          }}
          documentId={activeDeclareDoc.id}
          documentTitle={activeDeclareDoc.title}
          initialClassificationCode={classification?.code}
        />
      )}

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-3">
          <section aria-label="Dosya hazırlama" className="overflow-hidden rounded-xl border border-border bg-card shadow-flat">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
              <div><h2 className="text-sm font-semibold">Dosya hazırlama</h2><p className="mt-1 text-xs text-muted-foreground">Dosya başına en fazla {formatFileSize(maxUploadBytes)}.</p></div>
              <div className="flex flex-wrap gap-2"><Button type="button" size="sm" disabled={isSubmitting} onClick={() => fileInputRef.current?.click()}><Upload className="size-4" aria-hidden />Dosya ekle</Button><Button type="button" size="sm" variant="outline" disabled={isSubmitting} onClick={startCamera}><Camera className="size-4" aria-hidden />Kamera</Button></div>
            </div>
            <ScanFileQueue
              pages={pages}
              selectedId={selectedPage?.id}
              disabled={isSubmitting}
              maxUploadBytes={maxUploadBytes}
              onSelect={setSelectedIndex}
              onRotate={rotatePage}
              onRemove={removePage}
              onSeparator={toggleSeparator}
              onDetectSeparators={autoDetectSeparators}
              onRename={renamePageFile}
            />
            <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground"><span>{pages.length ? `${pages.length} dosya yüklemeye hazır.` : "Henüz dosya eklenmedi."}</span> {pages.length > 0 && `Toplam ${formatFileSize(totalBytes)} · ${distinctGroups.length} belge grubu`}</div>
          </section>
          <ScanPreview page={selectedPage} zoom={zoom} setZoom={setZoom} dragging={isDragging} disabled={isSubmitting} onDragChange={setIsDragging} onDrop={handleDrop} onSelectFiles={() => fileInputRef.current?.click()} />
        </div>
        <form aria-label="Arşiv ve indeks bilgileri" onSubmit={handleSubmit} aria-busy={isSubmitting} className="flex min-w-0 flex-col lg:sticky lg:top-4 lg:max-h-[calc(100dvh-160px)] overflow-hidden rounded-xl border border-border bg-card shadow-flat">
          <div className="shrink-0 border-b border-border px-3 py-2.5"><h2 className="text-sm font-semibold">Arşiv ve indeks bilgileri</h2></div>
          <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain">
          <fieldset disabled={isSubmitting} className="min-w-0 space-y-3 p-3 text-sm">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="scan-subject" className="font-medium">
                  Evrak konusu <span className="text-destructive" aria-hidden>*</span>
                </label>
                <div className="flex items-center gap-2.5">
                  {selectedPage && subject.trim() && (
                    <button
                      type="button"
                      onClick={syncFilenameWithSubject}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400"
                      title="Evrak konusuna göre dosya adını kurumsal arşive uygun olarak güncelle"
                    >
                      Dosya Adını Eşle
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={triggerSubjectSuggestion}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    title="Seçili dosya ve SDP bağlamına göre başlık öner"
                  >
                    <Sparkles className="size-3 text-amber-500" aria-hidden />
                    Başlık Öner
                  </button>
                </div>
              </div>
              <textarea
                id="scan-subject"
                placeholder="Belgeyi tanımlayan kısa ve anlaşılır bir başlık"
                rows={2}
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                required
                className="block w-full resize-y rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center gap-1 text-[10.5px] font-medium text-muted-foreground">
                  <Sparkles className="size-3 text-amber-500" aria-hidden />
                  <span>Hızlı Başlık Şablonları:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {subjectChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setSubject(chip)}
                      className="rounded-md border border-border/80 bg-muted/40 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <ScanFilingFields units={units} scope={scope} disabled={isSubmitting} onUnitChange={id => { setMetadataSchemaId(""); setMetadataValues({}); void scope.changeUnit(id); }} />
          {metadataSchemas.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="scan-schema"
                  className="font-bold text-foreground"
                >
                  Evrak Üstverisi
                </label>
                <select
                  id="scan-schema"
                  disabled={isSubmitting}
                  value={metadataSchemaId}
                  onChange={(event) => {
                    setMetadataSchemaId(event.target.value);
                    setMetadataValues({});
                  }}
                  className="h-10 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">— Üstveri girme —</option>
                  {metadataSchemas.map((schema) => (
                    <option key={schema.id} value={schema.id}>
                      {schema.name} (v{schema.version})
                    </option>
                  ))}
                </select>
              </div>

              {activeSchema?.fields.map((field) => (
                <MetadataFieldInput
                  key={field.id}
                  field={field}
                  value={metadataValues[field.key] ?? ""}
                  onChange={(value) =>
                    setMetadataValues((prev) => ({
                      ...prev,
                      [field.key]: value,
                    }))
                  }
                />
              ))}
            </div>
          )}


          </fieldset>
          </div>
          <div className="shrink-0 space-y-2 border-t border-border bg-muted/25 p-3">
            <dl className="flex justify-between gap-3 text-sm"><dt className="text-muted-foreground">Aktarım özeti</dt><dd className="text-right font-medium">{pages.length} dosya · {formatFileSize(totalBytes)}</dd></dl>
            {distinctGroups.length > 1 && <p className="text-xs leading-5 text-muted-foreground">Ayraçlarla ayrılan {distinctGroups.length} grup ayrı belge kayıtları olarak aktarılır. Ayraç dosyaları, grupta başka dosya varsa yüklenmez.</p>}
            {sizeIssue && <p role="alert" className="text-sm text-destructive">{sizeIssue}</p>}
            <Button type="submit" disabled={isSubmitting || pages.length === 0 || !ownerUnitId || scope.loading || !!scope.error || !!sizeIssue} className="w-full"><Upload className="size-4" aria-hidden />{isSubmitting ? "Aktarılıyor…" : distinctGroups.length > 1 ? `${distinctGroups.length} Belgeyi Toplu Aktar` : "Arşive Aktar"}</Button>
            <p className="text-xs leading-5 text-muted-foreground">Güvenlik taraması ve OCR arka planda sürer.</p>
          </div>
        </form>
      </div>
      <NetworkScanner onFiles={addFiles} disabled={isSubmitting} />
      {cameraStream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div role="dialog" aria-modal="true" aria-label="Kameradan belge çek" className="flex w-full max-w-lg flex-col gap-3 rounded-2xl bg-card p-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Camera className="size-4 text-sky-500" />
                Kameradan Belge Çek
              </h3>
              <button
                onClick={stopCamera}
                aria-label="Kamerayı kapat"
                className="rounded p-1 hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
              <video
                ref={element => { videoRef.current = element; if (element) element.srcObject = cameraStream; }}
                autoPlay
                playsInline
                className="size-full object-cover"
              />
              <div className="pointer-events-none absolute inset-4 rounded border-2 border-dashed border-sky-400/60" />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={stopCamera}>
                İptal
              </Button>
              <Button size="sm" onClick={captureFrame}>
                <Camera className="size-3.5" />
                Sayfayı Çek
              </Button>
            </div>
          </div>
        </div>
      )}


      <details className="overflow-hidden rounded-xl border border-border bg-card shadow-flat">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Seçili birimin son belgeleri</summary>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div><h2 className="text-sm font-semibold">Seçili birimin son belgeleri</h2><p className="mt-1 text-xs text-muted-foreground">{selectedUnit?.name ?? "Belgeleri görmek için birim seçin."}</p></div><Link href={ownerUnitId ? `/documents?ownerUnitId=${ownerUnitId}` : "/documents"} className="inline-flex items-center gap-1 text-sm text-sky-700 hover:underline dark:text-sky-300">Birim arşivini aç<ArrowUpRight className="size-4" aria-hidden /></Link></div>
        {!recentDocuments.length ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Bu birimde gösterilecek belge kaydı bulunmuyor.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground"><tr><th scope="col" className="px-4 py-3 font-medium">Belge başlığı</th><th scope="col" className="px-4 py-3 font-medium">Kayıt durumu</th><th scope="col" className="px-4 py-3 font-medium">Sürüm</th><th scope="col" className="px-4 py-3 font-medium">Kayıt tarihi</th><th scope="col" className="px-4 py-3 text-right font-medium">Belge</th></tr></thead><tbody className="divide-y divide-border">{recentDocuments.map(document => <tr key={document.id} className="hover:bg-muted/30"><td className="min-w-48 px-4 py-3 font-medium">{document.title}</td><td className="px-4 py-3"><Badge variant="outline">{documentStatusLabels[document.status] ?? document.status}</Badge></td><td className="px-4 py-3 tabular-nums">{document.versionCount}</td><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(document.createdAt).toLocaleDateString("tr-TR")}</td><td className="px-4 py-3 text-right"><Link href={`/documents/${document.id}`} aria-label={`${document.title} belgesini aç`} className="inline-flex items-center gap-1 text-sky-700 hover:underline dark:text-sky-300"><Eye className="size-4" aria-hidden />Aç</Link></td></tr>)}</tbody></table></div>}
      </details>
    </div>
  );
}

/**
 * Döndürme yalnız önizlemede kalmaz; görsel sayfalar yüklemeden önce canvas
 * üzerinde yeniden kodlanır, böylece arşive giden dosya ekranda görünenle aynı
 * olur. PDF sayfaları tarayıcıda döndürülemediği için olduğu gibi gönderilir.
 */
async function applyRotation(page: ScannedPage): Promise<File> {
  if (page.isPdf || page.rotation === 0) {
    return page.file;
  }

  const image = await loadImage(page.previewUrl);
  const swap = page.rotation === 90 || page.rotation === 270;
  const canvas = document.createElement("canvas");
  canvas.width = swap ? image.height : image.width;
  canvas.height = swap ? image.width : image.height;

  const context = canvas.getContext("2d");
  if (!context) return page.file;

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((page.rotation * Math.PI) / 180);
  context.drawImage(image, -image.width / 2, -image.height / 2);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );

  if (!blob) return page.file;

  return new File([blob], page.file.name, { type: "image/jpeg" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

const inputClass =
  "h-10 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Çoklu seçim değerleri tek metin state'inde bu ayraçla tutulur. */

/** Alan tipi backend şemasından gelir; burada yalnız uygun giriş kontrolü seçilir. */
function MetadataFieldInput({
  field,
  value,
  onChange,
}: {
  field: MetadataFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `metadata-${field.key}`;
  const options = parseFieldOptions(field.optionsJson);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  if (field.fieldType === "GeoPoint" || field.fieldType === "GeoPolygon" || field.fieldType === "GeoGeometry") {
    const defaultMode =
      field.fieldType === "GeoPolygon"
        ? "polygon"
        : field.fieldType === "GeoGeometry"
          ? "polygon"
          : "point";

    let displaySummary = "";
    if (value) {
      if (value.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(value);
          if (parsed.type === "Polygon") {
            const count = Array.isArray(parsed.coordinates?.[0]) ? parsed.coordinates[0].length - 1 : 0;
            displaySummary = `Poligon (${count} köşe)`;
          } else if (parsed.type === "LineString") {
            const count = Array.isArray(parsed.coordinates) ? parsed.coordinates.length : 0;
            displaySummary = `Çizgi / Hat (${count} nokta)`;
          } else if (parsed.type === "EntityRef") {
            displaySummary = `CBS: ${parsed.name} (${parsed.entityType})`;
          } else {
            displaySummary = "Coğrafi Geometri (GeoJSON)";
          }
        } catch {
          displaySummary = value.slice(0, 30);
        }
      } else {
        displaySummary = `Nokta: ${value}`;
      }
    }

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="font-semibold text-foreground">
          {field.label}
          {field.isRequired && <span className="ml-0.5 text-destructive">*</span>}
        </label>
        <div className="flex gap-1.5">
          <input
            id={id}
            type="text"
            placeholder={
              field.fieldType === "GeoPolygon"
                ? "Poligon geometrisi (Haritada çizerek seçin)"
                : field.fieldType === "GeoGeometry"
                  ? "Nokta, çizgi, poligon veya CBS varlığı"
                  : "Enlem, Boylam (Örn: 38.3552, 38.3095)"
            }
            value={value}
            required={field.isRequired}
            onChange={(event) => onChange(event.target.value)}
            className={`${inputClass} flex-1 font-mono text-xs`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsMapPickerOpen(true)}
            className="shrink-0 gap-1 text-xs"
            title="Haritada Konum, Poligon veya CBS Varlığı Seç"
          >
            {field.fieldType === "GeoPolygon" ? (
              <Pentagon className="size-3.5 text-amber-600" />
            ) : field.fieldType === "GeoGeometry" ? (
              <Shapes className="size-3.5 text-primary" />
            ) : (
              <MapPin className="size-3.5 text-rose-600" />
            )}
            {field.fieldType === "GeoPolygon" ? "Alanı Çiz / Seç" : "Haritada Seç"}
          </Button>
        </div>
        {displaySummary && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Seçim:</span>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
              {displaySummary}
            </span>
          </div>
        )}
        {isMapPickerOpen && (
          <GeoPointPickerDialog
            isOpen={isMapPickerOpen}
            onClose={() => setIsMapPickerOpen(false)}
            initialCoordinate={value}
            defaultMode={defaultMode}
            onSelect={(val) => onChange(val)}
          />
        )}
      </div>
    );
  }

  if (field.fieldType === "Boolean") {
    return (
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-2 font-semibold text-foreground"
      >
        <input
          id={id}
          type="checkbox"
          checked={value === "true"}
          onChange={(event) => onChange(String(event.target.checked))}
          className="size-3.5 rounded border-border"
        />
        {field.label}
      </label>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold text-foreground">
        {field.label}
        {field.isRequired && <span className="ml-0.5 text-destructive">*</span>}
      </label>

      {field.fieldType === "TextArea" || field.fieldType === "Json" ? (
        <textarea
          id={id}
          rows={2}
          value={value}
          required={field.isRequired}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-lg border border-border bg-background p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : options.length > 0 ? (
        <select
          id={id}
          value={
            field.fieldType === "MultiChoice"
              ? value.split(multiChoiceSeparator).filter(Boolean)
              : value
          }
          required={field.isRequired}
          multiple={field.fieldType === "MultiChoice"}
          onChange={(event) =>
            onChange(
              field.fieldType === "MultiChoice"
                ? Array.from(event.target.selectedOptions)
                    .map((option) => option.value)
                    .join(multiChoiceSeparator)
                : event.target.value,
            )
          }
          className={
            field.fieldType === "MultiChoice"
              ? "min-h-20 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground"
              : inputClass
          }
        >
          {field.fieldType !== "MultiChoice" && (
            <option value="">— Seçiniz —</option>
          )}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={metadataInputType(field.fieldType)}
          step={field.fieldType === "Decimal" ? "any" : undefined}
          value={value}
          required={field.isRequired}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );
}

function metadataInputType(
  fieldType: MetadataFieldDefinition["fieldType"],
): string {
  switch (fieldType) {
    case "Date":
      return "date";
    case "DateTime":
      return "datetime-local";
    case "Integer":
    case "Decimal":
      return "number";
    default:
      return "text";
  }
}
