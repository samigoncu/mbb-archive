"use client";
import { getUploadPolicy } from "@/features/settings/api/upload-policy";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/api-error";
import { stageDocumentFile } from "../api/stage-document-file";
import { getVersionUploadStatus } from "../api/version-upload-actions";
import { documentUploadAccept } from "../model/office-formats";
import { PostUploadDeclareDialog } from "@/features/archive/components/post-upload-declare-dialog";

export function DocumentVersionUpload({
  documentId,
  documentTitle = "",
  classificationCode,
  currentVersion,
  archived,
  canUpload,
  actions,
}: {
  documentId: string;
  documentTitle?: string;
  classificationCode?: string;
  currentVersion: number;
  archived: boolean;
  canUpload: boolean;
  actions?: ReactNode;
}) {
  const router = useRouter();
  const formId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState("");
  const [uploading, setUploading] = useState(false);
  const [ingestionId, setIngestionId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [limit, setLimit] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void getUploadPolicy().then(policy => { if (!cancelled) setLimit(policy.maxUploadBytes); })
      .catch(() => { if (!cancelled) setError("Yükleme sınırı alınamadı. Formu kapatıp yeniden açın."); });
    return () => { cancelled = true; };
  }, [open]);

  const [showDeclareDialog, setShowDeclareDialog] = useState(false);

  useEffect(() => {
    if (!ingestionId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;
    async function check() {
      try {
        const result = await getVersionUploadStatus(documentId, ingestionId!);
        if (cancelled) return;
        if (result.error || !result.data) {
          setError(result.error ?? "Yükleme durumu alınamadı.");
          return;
        }
        const { status, rejectionDetail, rejectionCode } = result.data;
        if (status === "Accepted") {
          setMessage("Yeni sürüm kaydedildi. Sürüm listesi ve belge görünümü yenileniyor.");
          setError("");
          setIngestionId(null);
          setShowDeclareDialog(true);
          router.refresh();
          return;
        }
        if (status === "Rejected" || status === "Failed") {
          setError(rejectionDetail ?? rejectionCode ?? "Dosya işlenemedi. Yeni sürüm oluşturulmadı.");
          setMessage("");
          setIngestionId(null);
          return;
        }
        setMessage(status === "SecurityApproved"
          ? "Güvenlik taraması tamamlandı. Yeni sürüm kaydediliyor…"
          : "Dosya yüklendi. Güvenlik taraması bekleniyor; yeni sürüm henüz hazır değil.");
        if (++polls < 60) timer = setTimeout(check, 3000);
        else setMessage("Dosyanın işlenmesi sürüyor. Son durumu ‘Durumu yenile’ ile kontrol edebilirsiniz.");
      } catch {
        if (!cancelled) setError("Yükleme durumu alınamadı. Durumu yenileyerek tekrar kontrol edin.");
      }
    }
    void check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [documentId, ingestionId, attempt, router]);

  if (archived || !canUpload) return <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
    <p className="text-sm text-muted-foreground">{archived ? "Arşivlenmiş belgenin içeriği değiştirilemez. Düzeltme için yeni belge kaydı oluşturulmalıdır." : "Yeni sürüm yüklemek için belge yazma yetkisi gereklidir."}</p>
    {actions}
  </section>;

  const busy = uploading || ingestionId !== null;
  return <section className="rounded-lg border border-border bg-card p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">{currentVersion > 0 ? `Mevcut sürüm: v${currentVersion}. Güncellenmiş dosyayı aynı belgeye ekleyin.` : "Bu belgeye henüz dosya yüklenmemiş."}</p>
      <div className="flex flex-wrap items-center gap-2">
      <Button type="button" aria-expanded={open} aria-controls={formId} onClick={() => setOpen(!open)}>
        <Upload className="size-4" aria-hidden />{currentVersion > 0 ? "Yeni sürüm yükle" : "Dosya yükle"}
      </Button>
      {actions}
      </div>
    </div>
    {open && <form id={formId} className="mt-4 space-y-3" onSubmit={async event => {
      event.preventDefault();
      if (busy || submitting.current) return;
      setError(""); setMessage("");
      if (!file || file.size === 0) { setError("Boş olmayan bir dosya seçmelisiniz."); return; }
      if (limit === null) { setError("Yükleme sınırı bekleniyor."); return; }
      if (file.size > limit) { setError(`Dosya boyutu ${limit / (1024 * 1024)} MB sınırını aşıyor.`); return; }
      if (currentVersion > 0 && !reason.trim()) { setError("Sürüm değişiklik gerekçesini yazın."); return; }
      submitting.current = true;
      setUploading(true);
      try {
        const staged = await stageDocumentFile(documentId, file, reason.trim());
        setMessage("Dosya yüklendi. Güvenlik taraması bekleniyor; yeni sürüm henüz hazır değil.");
        setIngestionId(staged.ingestionId);
        setFile(null); setReason("");
        if (fileInput.current) fileInput.current.value = "";
      } catch (failure) {
        setError(failure instanceof ApiError
          ? (failure.status === 403 ? "Bu belgeye yeni sürüm yükleme yetkiniz yok." : failure.message)
          : "Yükleme sonucu alınamadı. Yeniden yüklemeden önce sürüm listesini kontrol edin.");
      } finally { setUploading(false); submitting.current = false; }
    }}>
      <p className="text-xs text-muted-foreground">Önceki sürümler korunur. Yeni dosya güvenlik taramasından sonra güncel sürüm olur. {limit === null ? "Yükleme sınırı alınıyor…" : `En fazla ${limit / (1024 * 1024)} MB.`}</p>
      <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">{currentVersion > 0 ? "Yeni sürüm dosyası" : "Belge dosyası"}
          <input ref={fileInput} type="file" required accept={documentUploadAccept} className="mt-1 block w-full rounded-md border border-border bg-background p-2 text-sm" onChange={event => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <label className="text-sm">Sürüm değişiklik gerekçesi
          <textarea required={currentVersion > 0} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} className="mt-1 block w-full rounded-md border border-border bg-background p-2 text-sm" placeholder="Örn. Eksik sayfa tamamlandı, imzalı nüsha eklendi." />
        </label>
      </fieldset>
      <Button type="submit" disabled={busy || limit === null}>{uploading ? "Yükleniyor…" : ingestionId ? "Dosya işleniyor…" : currentVersion > 0 ? "Yeni sürümü gönder" : "Dosyayı gönder"}</Button>
    </form>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    {ingestionId && <button type="button" className="mt-2 text-sm text-primary underline" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Durumu yenile</button>}

    {showDeclareDialog && (
      <PostUploadDeclareDialog
        isOpen={showDeclareDialog}
        onOpenChange={setShowDeclareDialog}
        documentId={documentId}
        documentTitle={documentTitle}
        initialClassificationCode={classificationCode}
      />
    )}
  </section>;
}
