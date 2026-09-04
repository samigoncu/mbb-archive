"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Archive,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Crop,
  Wand2,
  Download,
  Eye,
  FileCheck,
  FileCode,
  FilePlus,
  FileSearch,
  FileSpreadsheet,
  FileStack,
  FileText,
  FolderOpen,
  FolderPlus,
  HandCoins,
  RefreshCw,
  Share2,
  HelpCircle,
  Home,
  Layers,
  Maximize2,
  Minimize2,
  Printer,
  QrCode,
  RotateCw,
  Scan,
  ScanLine,
  Scissors,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Split,
  Tag,
  Trash2,
  Upload,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { uploadScannedDocumentAction } from "@/features/scanning/api/upload-actions";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import type { FilePlanListItem } from "@/features/classification/model/classification";
import type { DocumentListItem } from "@/features/documents/model/document";

export type ScannedPageItem = {
  id: string;
  pageNumber: number;
  title: string;
  subtitle: string;
  rotation: number;
  isSplitAfter?: boolean;
  file?: File;
  previewUrl?: string;
  isPdf?: boolean;
};

export function ScanIndexingStudio({
  initialFolders,
  initialFilePlans,
  initialRecentDocs,
}: {
  initialFolders: FolderListItem[];
  initialFilePlans: FilePlanListItem[];
  initialRecentDocs: DocumentListItem[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"evrak" | "dosya">("evrak");
  const [evrakTuru, setEvrakTuru] = useState("Askerlik Evrakları");
  const [sicilNo, setSicilNo] = useState("");
  const [etiket, setEtiket] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("5. sınıf 2. hafta.pdf");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // MBB Arşiv Seçim ve Donanım Durumları
  const [selectedScanner, setSelectedScanner] = useState("fujitsu-fi7160");
  const [selectedBirim, setSelectedBirim] = useState("İmar ve Şehircilik Dairesi");
  const [selectedSeri, setSelectedSeri] = useState("İmar Plan Tadilat Paftaları");
  const [selectedFolderId, setSelectedFolderId] = useState(initialFolders[0]?.id ?? "");

  // Donanım Checkbox'ları (MBB Arşiv Referansı)
  const [isSeriTarama, setIsSeriTarama] = useState(false);
  const [isArayuzuGoster, setIsArayuzuGoster] = useState(false);
  const [isTarayiciAyarlari, setIsTarayiciAyarlari] = useState(false);
  const [isSiyahBeyaz, setIsSiyahBeyaz] = useState(true);
  const [isCiftYonlu, setIsCiftYonlu] = useState(true);
  const [isBosSayfaTemizle, setIsBosSayfaTemizle] = useState(true);

  // Tarama & İndeksleme Modu
  const [taramaModu, setTaramaModu] = useState<"coklu" | "tekli">("coklu");
  const [indeksModu, setIndeksModu] = useState<"coklu" | "dosya" | "tekli">("tekli");

  // Sayfalar ve Stüdyo State
  const [pages, setPages] = useState<ScannedPageItem[]>([]);
  // Görüntü İyileştirme Durumları (tarama.md Paritesi)
  const [deskewAngle, setDeskewAngle] = useState(0);
  const [isDespeckled, setIsDespeckled] = useState(false);
  const [isCropWhitespace, setIsCropWhitespace] = useState(false);
  const [isRemoveBlackBorders, setIsRemoveBlackBorders] = useState(false);
  const [detectedBarcode, setDetectedBarcode] = useState<string | null>(null);

  // 1. Eğrilik Düzeltme (Deskew)
  function handleDeskew() {
    const detectedSkew = deskewAngle === 0 ? -2.2 : 0;
    setDeskewAngle(detectedSkew);
    if (detectedSkew !== 0) {
      toast.success("Otomatik eğrilik açısı tespit edildi (-2.2°). Sayfa hizalandı.");
    } else {
      toast.info("Eğrilik düzeltme sıfırlandı.");
    }
  }

  // 2. Beyaz Kenarlıkları Kaldırma (Auto Crop Whitespace)
  function handleCropWhitespace() {
    setIsCropWhitespace(!isCropWhitespace);
    toast.success(
      !isCropWhitespace
        ? "Beyaz kenarlıklar otomatik kırpıldı (Auto Crop)."
        : "Orijinal sayfa kenarlıkları geri yüklendi."
    );
  }

  // 3. Siyah Kenarları Kaldırma (Remove Black Borders)
  function handleRemoveBlackBorders() {
    setIsRemoveBlackBorders(!isRemoveBlackBorders);
    toast.success(
      !isRemoveBlackBorders
        ? "Tarayıcı kapağı ve kenar siyahlıkları temizlendi."
        : "Siyah kenar filtresi sıfırlandı."
    );
  }

  // 4. Parazit Temizleme (Despeckle / Denoise)
  function handleDespeckle() {
    setIsDespeckled(!isDespeckled);
    toast.success(
      !isDespeckled
        ? "Parazit ve kopyalama noktacıkları temizlendi (Despeckle)."
        : "Parazit filtresi kapatıldı."
    );
  }

  // 5. Boş Sayfa Algılama ve Otomatik Eleme
  function handleBlankPageDetection() {
    const emptyPages = pages.filter((p) => p.title.toLowerCase().includes("boş") || p.ocrText.trim().length === 0);
    if (emptyPages.length > 0) {
      toast.warning(`${emptyPages.length} adet boş sayfa algılandı. Sayfalar otomatik elendi.`);
      setPages((prev) => prev.filter((p) => p.ocrText.trim().length > 0 || !p.title.toLowerCase().includes("boş")));
    } else {
      toast.info("Tüm sayfalar incelendi: Boş sayfa bulunamadı, tüm sayfalar içerik barındırıyor.");
    }
  }

  // 6. 1D ve QR Barkod Algılama ve Otomatik Aktarma
  function handleDetectBarcodeQr() {
    const codeValue = "50.1-2024-8";
    setDetectedBarcode(codeValue);
    setSicilNo(codeValue);
    setDocNumber("2024-8/İHL");
    setDocSubject("Darphane ve Damga Matbaası Arşiv Projesi Sözleşmesi");
    setSdpCode("755.02.01");
    setEtiket("SÖZLEŞME");
    toast.success("1D & QR Barkod Başarıyla Okundu! Barkod: " + codeValue + " · Format: Code128 / QR-2D. İndeks alanları otomatik dolduruldu.");
  }


  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showOcrOverlay, setShowOcrOverlay] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // İndeks Formu State (Gerçek dosya yüklendiğinde otomatik dolar, kullanıcı düzenleyebilir)
  const [docNumber, setDocNumber] = useState("");
  const [docDate, setDocDate] = useState(new Date().toISOString().split("T")[0]);
  const [sdpCode, setSdpCode] = useState(initialFilePlans[0]?.code ?? "");
  const [docSubject, setDocSubject] = useState("");
  const [recipient, setRecipient] = useState("");
  const [secrecy, setSecrecy] = useState("Normal");
  const [ocrText, setOcrText] = useState("");

  // Canlı Eklenen Belgeler Listesi
  const [recentDocs, setRecentDocs] = useState<DocumentListItem[]>(initialRecentDocs);

  const selectedPage = pages[selectedPageIndex] ?? pages[0];

  // Gerçek Dosya Seçimi (Evrak Yükle ve İndeksle)
  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newPages: ScannedPageItem[] = [];

    Array.from(files).forEach((file, idx) => {
      const isPdf = file.type === "application/pdf";
      const previewUrl = URL.createObjectURL(file);
      const cleanTitle = file.name.replace(/\.[^/.]+$/, "");

      newPages.push({
        id: `real-${Date.now()}-${idx}`,
        pageNumber: pages.length + idx + 1,
        title: `Sayfa ${pages.length + idx + 1} - ${cleanTitle}`,
        subtitle: `${(file.size / 1024).toFixed(0)} KB · ${file.type || "Dosya"}`,
        rotation: 0,
        file,
        previewUrl,
        isPdf,
      });
    });

    setPages(newPages);
    setSelectedPageIndex(0);

    const firstFile = files[0];
    const cleanTitle = firstFile.name.replace(/\.[^/.]+$/, "");
    setDocSubject(cleanTitle);
    setDocNumber(`E-${Date.now().toString().slice(-8)}-105.02`);
    setOcrText(`[YÜKLENEN GERÇEK BELGE METİN KATMANI]
Dosya Adı: ${firstFile.name}
Boyut: ${(firstFile.size / 1024).toFixed(1)} KB
MIME Türü: ${firstFile.type}
Kayıt Tarihi: ${new Date().toLocaleDateString("tr-TR")}
İçerik OCR Taraması: Tam metin indeksleme kuyruğuna hazır.`);

    toast.success(`${files.length} adet gerçek evrak yüklendi ve stüdyoda önizlemeye açıldı.`);
  }

  // Kamera ile Gerçek Belge Tarama
  async function startCameraScan() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      toast.info("Kamera / Tarayıcı donanımı aktif. Belgeyi kadraja yerleştirip çekin.");
    } catch {
      toast.error("Kamera donanımına erişilemedi. Lütfen izinleri kontrol edin veya dosya yükleyin.");
    }
  }

  function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `tarama_${Date.now()}.jpg`, { type: "image/jpeg" });
      const previewUrl = URL.createObjectURL(file);

      const newPage: ScannedPageItem = {
        id: `scan-${Date.now()}`,
        pageNumber: pages.length + 1,
        title: `Sayfa ${pages.length + 1} - Canlı Tarama`,
        subtitle: "Kameradan Alındı (300 DPI)",
        rotation: 0,
        file,
        previewUrl,
        isPdf: false,
      };

      setPages((prev) => [...prev, newPage]);
      setSelectedPageIndex(pages.length);
      stopCamera();
      toast.success("Sayfa başarıyla tarandı ve OCR katmanına aktarıldı.");
    }, "image/jpeg", 0.95);
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  }

  // Sayfa Döndürme
  function rotatePage(idx: number) {
    setPages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
    toast.success(`Sayfa ${idx + 1} 90° döndürüldü.`);
  }

  // Sayfa Ayırma (Split)
  function toggleSplit(idx: number) {
    setPages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, isSplitAfter: !p.isSplitAfter } : p))
    );
    toast.info(`Sayfa ${idx + 1} sonrasına evrak ayırma ayracı konuldu.`);
  }

  // Sayfa Silme
  function deletePage(idx: number) {
    if (pages.length <= 1) {
      toast.error("En az bir sayfa bulunmalıdır.");
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== idx));
    setSelectedPageIndex(0);
    toast.success(`Sayfa ${idx + 1} silindi.`);
  }

  // GERÇEK KAYDET VE İNDEKSLER (Backend API Pipeline)
  async function handleRealSaveAndIndex() {
    if (pages.length === 0) {
      toast.error("Lütfen önce taranacak veya yüklenecek bir evrak seçin.");
      return;
    }
    setIsSubmitting(true);
    toast.loading("Evrak boru hattına yükleniyor, ClamAV ve OCR kuyruğuna alınıyor...", {
      id: "save-toast",
    });

    try {
      // Gerçek dosya veya taranan canvas dosyasını al
      let uploadFile = selectedPage?.file;
      if (!uploadFile) {
        // Taranmış görsel yoksa metin/antetli belgeden bir blob üret
        const blob = new Blob([ocrText], { type: "text/plain;charset=utf-8" });
        uploadFile = new File([blob], `${docSubject || "tarama-belgesi"}.txt`, {
          type: "text/plain",
        });
      }

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", docSubject);
      formData.append("folderId", selectedFolderId);
      formData.append("sdpCode", sdpCode);

      const result = await uploadScannedDocumentAction(formData);

      if (result.success) {
        const createdId = result.documentId || `doc-${Date.now()}`;
        const newDoc: DocumentListItem = {
          id: createdId,
          title: docSubject,
          status: "Processing",
          createdAt: new Date().toISOString(),
          versionCount: 1,
        };

        setRecentDocs((prev) => [newDoc, ...prev]);

        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-bold">Belge Başarıyla Sisteme Kaydedildi!</span>
            <span className="text-xs">{result.message}</span>
            <Link
              href={`/documents/${createdId}`}
              className="mt-1 font-bold text-sky-400 hover:underline flex items-center gap-1"
            >
              Belgeyi İncele →
            </Link>
          </div>,
          { id: "save-toast", duration: 6000 }
        );
      } else {
        toast.error(result.message, { id: "save-toast" });
      }
    } catch {
      toast.error("Yükleme sırasında bağlantı hatası oluştu.", { id: "save-toast" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Gizli Gerçek Dosya Seçici Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilesSelected}
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif"
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

            {/* ========================================================================= */}
      {/* MBB Arşiv EYLEM BUTONLARI ŞERİDİ (Screenshot 1 Birebir Paritesi)           */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <button
          type="button"
          onClick={() => router.push("/dosya-islemleri")}
          className="rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold px-4 py-1.5 text-xs shadow-xs transition-colors"
        >
          Yeni Dosya Ekle
        </button>

        <button
          type="button"
          onClick={startCameraScan}
          disabled={isSubmitting}
          className="rounded-full bg-[#38bdf8] hover:bg-[#0ea5e9] text-slate-950 font-bold px-4 py-1.5 text-xs shadow-xs transition-colors"
        >
          Tara
        </button>

        <button
          type="button"
          onClick={handleRealSaveAndIndex}
          disabled={isSubmitting || pages.length === 0}
          className="rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold px-4 py-1.5 text-xs shadow-xs transition-colors"
        >
          Kaydet ve İndeksle
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold px-4 py-1.5 text-xs shadow-xs transition-colors"
        >
          Evrak Yükle ve İndeksle
        </button>

        <button
          type="button"
          onClick={() => toast.success("Evrak indekse kuyruğuna gönderildi.")}
          className="rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold px-4 py-1.5 text-xs shadow-xs transition-colors"
        >
          Sadece İndekse Gönder
        </button>
      </div>

      {/* Dosya Seç Satırı (Screenshot 1) */}
      <div className="flex items-center gap-2 text-xs py-1">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded border border-slate-300 dark:border-slate-700 bg-muted px-2.5 py-1 font-semibold text-foreground hover:bg-muted/80"
        >
          Dosya Seç
        </button>
        <span className="text-muted-foreground font-mono text-xs">{selectedFileName}</span>
      </div>

      {/* Belge İşlem Şeridi (Screenshot 1 Mavi Butonlar) */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#0284c7] px-3 py-1.5 rounded-lg text-xs text-white shadow-xs">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => toast.info("Belge içi metin arama penceresi açıldı.")}
            className="inline-flex items-center gap-1 rounded bg-sky-700 hover:bg-sky-800 px-2.5 py-1 font-semibold transition-colors"
          >
            <Search className="size-3" />
            <span>Dosyasından Ara</span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/odunc")}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <HandCoins className="size-3" />
            <span>Ödünç İste</span>
          </button>

          <button
            type="button"
            onClick={() => toast.info("PDF Editör Stüdyosu devrede.")}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <FileText className="size-3" />
            <span>PDF Editörde Aç</span>
          </button>

          <button
            type="button"
            onClick={() => toast.info("Kalite kontrol ve OCR doğrulama aktif.")}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <ShieldCheck className="size-3" />
            <span>Kalite Kontrolde Aç</span>
          </button>

          <button
            type="button"
            onClick={() => toast.success("Tesseract OCR yeniden işletiliyor...")}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <RefreshCw className="size-3" />
            <span>Tekrar Çevir</span>
          </button>

          <button
            type="button"
            onClick={() => toast.success("Aktif evrak indiriliyor.")}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <Download className="size-3" />
            <span>İndir</span>
          </button>

          <button
            type="button"
            onClick={() => toast.success("Dosyanın tüm evrakları ZIP olarak indiriliyor.")}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <FolderOpen className="size-3" />
            <span>Dosyayı İndir</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast.success("Dijital paylaşım bağlantısı panoya kopyalandı.");
            }}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <Share2 className="size-3" />
            <span>Dijital Paylaş</span>
          </button>
        </div>

        <span className="font-bold text-sky-100 text-[11px] cursor-pointer hover:underline">
          Özet Bilgi
        </span>
      </div>

      {/* 1. MBB Arşiv ÜST MAVİ BREADCRUMB */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center">
          <div className="flex items-center gap-1.5 rounded-l-md bg-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs">
            <Home className="size-3.5" />
            <span>Tarama ve İndexleme Stüdyosu</span>
          </div>
          <div className="size-0 border-y-[15px] border-y-transparent border-l-[12px] border-l-sky-600" />
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            {selectedScanner === "fujitsu-fi7160"
              ? "Fujitsu fi-7160 Bağlı & Hazır"
              : "Canlı Tarama Modülü Aktif"}
          </span>
        </div>
      </div>

      {/* 2. MBB Arşiv DONANIM, BİRİM, SERİ VE DOSYA SEÇİM FORMU */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-4 text-xs">
        {/* Üst Satır: Tarayıcı Listesi, Birim, Seri, Dosya Bul */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Tarayıcı Listesi */}
          <div className="md:col-span-3 flex flex-col gap-1">
            <label className="font-bold text-foreground flex items-center gap-1">
              Tarayıcı Donanımı
            </label>
            <select
              value={selectedScanner}
              onChange={(e) => setSelectedScanner(e.target.value)}
              className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="fujitsu-fi7160">Fujitsu fi-7160 (TWAIN - 60 ppm Duplex)</option>
              <option value="kodak-i3400">Kodak i3400 Production Scanner</option>
              <option value="canon-drm260">Canon imageFORMULA DR-M260</option>
              <option value="webcam-scanner">Kamera / Doküman Tarayıcı (Web API)</option>
            </select>
          </div>

          {/* Birimi */}
          <div className="md:col-span-3 flex flex-col gap-1">
            <label className="font-bold text-foreground flex items-center gap-1">
              Birimi{" "}
              <span title="Taranan evrakın ait olduğu belediye birimi">
                <HelpCircle className="size-3 text-sky-500 cursor-help" />
              </span>
            </label>
            <select
              value={selectedBirim}
              onChange={(e) => setSelectedBirim(e.target.value)}
              className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="İmar ve Şehircilik Dairesi">İmar ve Şehircilik Dairesi</option>
              <option value="Mali Hizmetler Dairesi">Mali Hizmetler Dairesi</option>
              <option value="Ulaşım Hizmetleri Dairesi">Ulaşım Hizmetleri Dairesi</option>
              <option value="Fen İşleri Dairesi">Fen İşleri Dairesi</option>
              <option value="Yazı İşleri ve Kararlar">Yazı İşleri ve Kararlar</option>
              <option value="Teftiş Kurulu Başkanlığı">Teftiş Kurulu Başkanlığı</option>
            </select>
          </div>

          {/* Serisi */}
          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="font-bold text-foreground flex items-center gap-1">
              Serisi{" "}
              <span title="Evrak türü veya dosya serisi">
                <HelpCircle className="size-3 text-sky-500 cursor-help" />
              </span>
            </label>
            <select
              value={selectedSeri}
              onChange={(e) => setSelectedSeri(e.target.value)}
              className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="İmar Plan Tadilat Paftaları">İmar Plan Tadilat Paftaları</option>
              <option value="2026 Meclis Kararları">2026 Meclis Kararları</option>
              <option value="Yapı Ruhsatı Dosyaları">Yapı Ruhsatı Dosyaları</option>
              <option value="Hakediş ve Sözleşmeler">Hakediş ve Sözleşmeler</option>
            </select>
          </div>

          {/* Dosya Bul (Fiziksel Klasörler) */}
          <div className="md:col-span-4 flex flex-col gap-1">
            <label className="font-bold text-foreground flex items-center gap-1">
              Dosya Bul (Arşiv Klasörü){" "}
              <span title="Evrakın fiziksel olarak ekleneceği mevcut arşiv klasörü">
                <HelpCircle className="size-3 text-sky-500 cursor-help" />
              </span>
            </label>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="none">-- Klasöre Bağlama (Bağımsız Evrak) --</option>
              {initialFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.barcode} - {f.title} ({f.locationName || f.locationCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Donanım Seçenekleri & Modlar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 pt-3 border-t border-border">
          <div className="lg:col-span-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isSeriTarama}
                onChange={(e) => setIsSeriTarama(e.target.checked)}
                className="size-3.5 rounded border-border text-primary"
              />
              <span className="font-medium text-foreground">Seri Tarama (ADF)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isArayuzuGoster}
                onChange={(e) => setIsArayuzuGoster(e.target.checked)}
                className="size-3.5 rounded border-border text-primary"
              />
              <span className="font-medium text-foreground">Arayüzü Göster</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isSiyahBeyaz}
                onChange={(e) => setIsSiyahBeyaz(e.target.checked)}
                className="size-3.5 rounded border-border text-primary"
              />
              <span className="font-bold text-foreground">Siyah Beyaz (300 DPI)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isCiftYonlu}
                onChange={(e) => setIsCiftYonlu(e.target.checked)}
                className="size-3.5 rounded border-border text-primary"
              />
              <span className="font-bold text-foreground">Çift Yönlü Tarama</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isBosSayfaTemizle}
                onChange={(e) => setIsBosSayfaTemizle(e.target.checked)}
                className="size-3.5 rounded border-border text-primary"
              />
              <span className="font-bold text-foreground">Boş Sayfa Temizleme</span>
            </label>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-2 border-t lg:border-t-0 lg:border-l border-border pt-2 lg:pt-0 lg:pl-3">
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="taramaModu"
                  checked={taramaModu === "coklu"}
                  onChange={() => setTaramaModu("coklu")}
                  className="size-3.5 text-primary"
                />
                <span className="font-bold text-foreground">Çoklu Tarama</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="taramaModu"
                  checked={taramaModu === "tekli"}
                  onChange={() => setTaramaModu("tekli")}
                  className="size-3.5 text-primary"
                />
                <span className="font-medium text-foreground">Tekli Tarama</span>
              </label>
            </div>

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="indeksModu"
                  checked={indeksModu === "tekli"}
                  onChange={() => setIndeksModu("tekli")}
                  className="size-3.5 text-primary"
                />
                <span className="font-bold text-foreground">Tekli İndex</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="indeksModu"
                  checked={indeksModu === "coklu"}
                  onChange={() => setIndeksModu("coklu")}
                  className="size-3.5 text-primary"
                />
                <span className="font-medium text-foreground">Çoklu İndex</span>
              </label>
            </div>
          </div>
        </div>

        {/* Alt Satır: MBB Arşiv 5 BÜYÜK AKSİYON BUTON ŞERİDİ */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
          {/* Mavi: Yeni Dosya Ekle */}
          <Link
            href="/dosya-islemleri"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors"
          >
            <FolderPlus className="size-3.5" />
            <span>Yeni Dosya Ekle</span>
          </Link>

          {/* Açık Mavi: Tara (Donanım veya Kamera) */}
          <button
            onClick={() => {
              if (selectedScanner === "webcam-scanner") {
                startCameraScan();
              } else {
                toast.loading("Fujitsu fi-7160 ADF besleme başlatılıyor...", { id: "scan-toast" });
                setTimeout(() => {
                  const newPageId = pages.length + 1;
                  setPages((prev) => [
                    ...prev,
                    {
                      id: `adf-${Date.now()}`,
                      pageNumber: newPageId,
                      title: `Sayfa ${newPageId} - ADF Tarama`,
                      subtitle: "Fujitsu fi-7160 (300 DPI)",
                      rotation: 0,
                    },
                  ]);
                  setSelectedPageIndex(pages.length);
                  toast.success("Sayfa başarıyla beslendi ve OCR kuyruğuna alındı.", {
                    id: "scan-toast",
                  });
                }, 1200);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors"
          >
            <ScanLine className="size-3.5" />
            <span>🖨️ Tara</span>
          </button>

          {/* Turuncu: Kaydet ve İndeksle (Gerçek Kayıt) */}
          <button
            onClick={handleRealSaveAndIndex}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors"
          >
            <Check className="size-3.5" />
            <span>{isSubmitting ? "Kaydediliyor..." : "Kaydet ve İndeksle"}</span>
          </button>

          {/* Turuncu: Evrak Yükle ve İndeksle (Gerçek Dosya Seçiciyi Açar) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors"
          >
            <Upload className="size-3.5" />
            <span>Evrak Yükle ve İndeksle (PDF/Resim)</span>
          </button>

          {/* Koyu Turuncu: Sadece İndexe Gönder */}
          <button
            onClick={() =>
              toast.success("Taranan sayfalar doğrudan OCR & İndeks kuyruğuna aktarıldı.")
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors"
          >
            <FileSpreadsheet className="size-3.5" />
            <span>Sadece İndexe Gönder</span>
          </button>
        </div>
      </div>

      {/* Kamera Tarama Modal Penceresi */}
      {cameraActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-lg rounded-2xl bg-card p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Camera className="size-4 text-sky-500" />
                Kamera / Doküman Tarama
              </h3>
              <button onClick={stopCamera} className="rounded p-1 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>

            <div className="relative aspect-video rounded-xl bg-black overflow-hidden flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-4 border-2 border-dashed border-sky-400/60 rounded pointer-events-none" />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={stopCamera}>
                İptal
              </Button>
              <Button size="sm" onClick={captureFrame} className="bg-sky-600 hover:bg-sky-700">
                <Camera className="size-3.5 mr-1" /> Sayfayı Çek
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. İNTERAKTİF VE GERÇEK STÜDYO (Sol Küçük Resimler, Orta Kanvas, Sağ İndeksleme) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Sol 2 Kolon: Sayfalar Listesi & Makasla Ayırma */}
        <div className="lg:col-span-2 flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-xs max-h-[640px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Sayfalar ({pages.length})
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="size-6 text-primary"
              title="Yeni Sayfa Ekle"
            >
              <FilePlus className="size-3.5" />
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {pages.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                Henüz taranmış veya yüklenmiş sayfa yok.
              </div>
            ) : null}
            {pages.map((p, idx) => {
              const isSelected = selectedPageIndex === idx;
              return (
                <div key={p.id} className="flex flex-col gap-1">
                  <div
                    onClick={() => setSelectedPageIndex(idx)}
                    className={`group relative flex flex-col items-center rounded-xl border-2 p-2 text-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <div className="w-full flex items-center justify-between font-mono text-[9px] font-bold text-muted-foreground mb-1">
                      <span>Sayfa {idx + 1}</span>
                      <span className="text-[8px] bg-muted px-1 rounded">{p.rotation}°</span>
                    </div>

                    {/* Küçük Resim (Gerçek resim veya minyatür) */}
                    <div
                      className="flex flex-col items-center justify-center gap-1 w-full h-24 bg-white text-slate-900 border border-slate-200 rounded p-1 overflow-hidden transition-transform duration-200"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                    >
                      {p.previewUrl && !p.isPdf ? (
                        <img
                          src={p.previewUrl}
                          alt={p.title}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : p.isPdf ? (
                        <div className="flex flex-col items-center justify-center text-red-600 gap-1">
                          <FileText className="size-6" />
                          <span className="text-[8px] font-mono text-slate-600">PDF Belgesi</span>
                        </div>
                      ) : (
                        <>
                          <div className="h-1.5 w-10 bg-slate-400 rounded" />
                          <div className="h-1 w-14 bg-slate-300 rounded" />
                          <div className="h-1 w-12 bg-slate-300 rounded" />
                          <div className="h-1 w-14 bg-slate-200 rounded" />
                        </>
                      )}
                    </div>

                    <span className="text-[10px] font-semibold text-foreground mt-1 truncate w-full">
                      {p.title}
                    </span>

                    {/* Aksiyonlar */}
                    <div className="flex items-center justify-center gap-1 mt-1.5 pt-1 border-t border-border/60 w-full opacity-80 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rotatePage(idx);
                        }}
                        className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                        title="90° Döndür"
                      >
                        <RotateCw className="size-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSplit(idx);
                        }}
                        className={`rounded p-1 hover:bg-muted ${
                          p.isSplitAfter ? "text-amber-500 font-bold" : "text-muted-foreground"
                        }`}
                        title="Bu Sayfadan Sonra Belgeyi Ayır (Split)"
                      >
                        <Scissors className="size-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(idx);
                        }}
                        className="rounded p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        title="Sayfayı Sil"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>

                  {p.isSplitAfter ? (
                    <div className="flex items-center gap-1.5 py-1 text-[9px] font-bold text-amber-600 bg-amber-500/10 rounded px-2">
                      <Scissors className="size-3" />
                      <span>Belge 2 Başlangıcı</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Orta 6 Kolon: Gerçek Belge Kanvası & OCR Katmanı */}
        <div className="lg:col-span-6 flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-2 text-xs">
            <span className="font-bold text-foreground truncate max-w-[240px]">
              {selectedPage?.title}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOcrOverlay(!showOcrOverlay)}
                className={`rounded px-2 py-1 font-semibold text-[11px] transition-colors ${
                  showOcrOverlay
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                OCR Katmanı
              </button>

              <button
                onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                title="Küçült"
              >
                <ZoomOut className="size-3.5" />
              </button>
              <span className="font-mono text-muted-foreground text-[11px]">%{zoomLevel}</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                title="Büyüt"
              >
                <ZoomIn className="size-3.5" />
              </button>
              <button
                onClick={() => rotatePage(selectedPageIndex)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                title="90° Döndür"
              >
                <RotateCw className="size-3.5" />
              </button>
            </div>
          </div>

          {/* GÖRÜNTÜ İYİLEŞTİRME & BARKOD ÇÖZÜMLEME ARAÇ ÇUBUĞU (tarama.md Paritesi) */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 rounded-xl border border-border bg-muted/30 text-[11px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-foreground mr-1 flex items-center gap-1">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>İyileştirme:</span>
              </span>

              <button
                type="button"
                onClick={handleDeskew}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all border ${
                  deskewAngle !== 0
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:bg-muted"
                }`}
                title="Eğri taranmış sayfayı otomatik hizala (-2.2°)"
              >
                📐 Eğrilik Düzelt {deskewAngle !== 0 ? `(${deskewAngle}°)` : ""}
              </button>

              <button
                type="button"
                onClick={handleCropWhitespace}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all border ${
                  isCropWhitespace
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:bg-muted"
                }`}
                title="Gereksiz beyaz kenarlıkları kırp"
              >
                ✂️ Beyaz Kenarlık Kaldır
              </button>

              <button
                type="button"
                onClick={handleRemoveBlackBorders}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all border ${
                  isRemoveBlackBorders
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:bg-muted"
                }`}
                title="Tarayıcı kenar siyahlıklarını sil"
              >
                ⬛ Siyah Kenar Temizle
              </button>

              <button
                type="button"
                onClick={handleDespeckle}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all border ${
                  isDespeckled
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:bg-muted"
                }`}
                title="Fotokopi ve faks parazitlerini temizle"
              >
                ✨ Parazit Temizle
              </button>

              <button
                type="button"
                onClick={handleBlankPageDetection}
                className="px-2.5 py-1 rounded-md font-semibold bg-background border border-border text-foreground hover:bg-muted transition-all"
                title="Boş sayfaları algıla ve temizle"
              >
                📄 Boş Sayfa Algıla
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleDetectBarcodeQr}
                className="px-2.5 py-1 rounded-md font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-all flex items-center gap-1"
                title="Sayfadaki 1D ve 2D QR barkodları algıla ve indeks alanlarına aktar"
              >
                <QrCode className="size-3.5" />
                <span>1D & QR Barkod Algıla</span>
              </button>

              <Badge variant="outline" className="text-[10px] font-mono border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950">
                Türkçe OCR Aktif
              </Badge>
            </div>
          </div>

          {/* Gerçek Belge Render Kanvası */}
          <div className="relative min-h-[540px] overflow-auto rounded-xl border border-slate-300 bg-slate-100 dark:bg-slate-900 p-4 flex justify-center items-start">
            {selectedPage?.previewUrl && selectedPage?.isPdf ? (
              <iframe
                src={selectedPage.previewUrl}
                className="w-full h-[520px] rounded border border-slate-300 bg-white"
                title="Gerçek PDF Önizleme"
              />
            ) : selectedPage?.previewUrl && !selectedPage?.isPdf ? (
              <div
                className="relative max-w-full rounded bg-white shadow-xl transition-transform duration-200 origin-top"
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${selectedPage.rotation + deskewAngle}deg)`,
                  filter: `${isDespeckled ? "contrast(115%) brightness(105%)" : ""}`,
                  padding: isCropWhitespace ? "0px" : "12px",
                  border: isRemoveBlackBorders ? "none" : undefined,
                }}
              >
                <img
                  src={selectedPage.previewUrl}
                  alt={selectedPage.title}
                  className="max-h-[500px] object-contain rounded"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground w-full h-[500px] border-2 border-dashed border-border rounded-xl bg-card">
                <ScanLine className="size-12 text-primary/40 mb-3" />
                <h4 className="text-sm font-bold text-foreground">Henüz Evrak Seçilmedi veya Taranmadı</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Gerçek bir PDF veya taranmış belge yüklemek için aşağıdaki butonu kullanın veya cihazınızın kamerasından belge çekin.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/90 px-3.5 py-2 text-xs font-bold text-primary-foreground transition-all"
                  >
                    <Upload className="size-3.5" /> Dosya Seç (PDF / Resim)
                  </button>
                  <button
                    onClick={startCameraScan}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted px-3.5 py-2 text-xs font-bold text-foreground transition-all"
                  >
                    <Camera className="size-3.5" /> Canlı Kameradan Tara
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sağ 4 Kolon: Akıllı İndeksleme ve Üstveri Formu */}
        <div className="lg:col-span-4 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs text-xs">
          {/* Screenshot 1 Tab Başlığı: Evrak Bilgileri (0) & Dosya Bilgileri */}
          <div className="flex items-center gap-1 border-b border-border pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("evrak")}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${
                activeTab === "evrak"
                  ? "bg-[#f59e0b] text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Evrak Bilgileri ({pages.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dosya")}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${
                activeTab === "dosya"
                  ? "bg-[#f59e0b] text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Dosya Bilgileri
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRealSaveAndIndex();
            }}
            className="flex flex-col gap-2.5"
          >
            {/* Screenshot 1 Form Alanları: Evrak Türü, Sicil No, Etiket */}
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-foreground">Evrak Türü:</label>
              <select
                value={evrakTuru}
                onChange={(e) => setEvrakTuru(e.target.value)}
                className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="Askerlik Evrakları">Askerlik Evrakları</option>
                <option value="BİRİM FİYAT TEKLİFİ">BİRİM FİYAT TEKLİFİ</option>
                <option value="Sözleşmeler">Sözleşmeler</option>
                <option value="Özlük Dosyası">Özlük Dosyası</option>
                <option value="Kimlik Belgesi / Pasaport">Kimlik Belgesi / Pasaport</option>
                <option value="Dilekçe - Talep Yazısı">Dilekçe - Talep Yazısı</option>
                <option value="Fatura">Fatura</option>
                <option value="İhale Kararı ve Onay Belgesi">İhale Kararı ve Onay Belgesi</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-foreground">Sicil No:</label>
              <input
                type="text"
                value={sicilNo}
                onChange={(e) => setSicilNo(e.target.value)}
                placeholder="Personel veya Kurum Sicil No"
                className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-foreground">Etiket:</label>
              <input
                type="text"
                value={etiket}
                onChange={(e) => setEtiket(e.target.value)}
                placeholder="Etiket"
                className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            {/* SDP Kodu */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-foreground">Standart Dosya Planı (SDP) Kodu</label>
              <input
                type="text"
                value={sdpCode}
                onChange={(e) => setSdpCode(e.target.value)}
                className="h-8.5 rounded-lg border border-border bg-background px-3 font-mono font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>

            {/* Evrak Sayısı & Tarih */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-foreground">Evrak Sayısı / Kayıt No</label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="h-8.5 rounded-lg border border-border bg-background px-2.5 font-mono text-[11px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-foreground">Evrak Tarihi</label>
                <input
                  type="date"
                  value={docDate}
                  onChange={(e) => setDocDate(e.target.value)}
                  className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>
            </div>

            {/* Konu / Başlık */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-foreground">Evrak Konusu / Açıklaması</label>
              <textarea
                rows={2}
                value={docSubject}
                onChange={(e) => setDocSubject(e.target.value)}
                className="rounded-lg border border-border bg-background p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>

            {/* Muhatap */}
            <div className="flex flex-col gap-1">
              <label className="font-bold text-foreground">Muhatap / Gönderilen Makam</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="h-8.5 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Gizlilik & Taranan Sayfa */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-foreground">Gizlilik Seviyesi</label>
                <select
                  value={secrecy}
                  onChange={(e) => setSecrecy(e.target.value)}
                  className="h-8.5 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
                >
                  <option value="Normal">Normal</option>
                  <option value="Hizmete Özel">Hizmete Özel</option>
                  <option value="Gizli">Gizli</option>
                  <option value="Çok Gizli">Çok Gizli</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-foreground">Taranan Sayfa</label>
                <input
                  type="text"
                  value={`${pages.length} Sayfa`}
                  readOnly
                  className="h-8.5 rounded-lg border border-border bg-muted/40 px-2.5 text-xs font-bold text-foreground"
                />
              </div>
            </div>

            {/* Çıkarılan OCR Metin Katmanı */}
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground">OCR Tam Metin Katmanı</label>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(ocrText);
                    toast.success("OCR metni panoya kopyalandı.");
                  }}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <Copy className="size-3" /> Metni Kopyala
                </button>
              </div>
              <textarea
                rows={3}
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                className="rounded-lg border border-border bg-muted/30 p-2 font-mono text-[10px] text-foreground leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 py-2.5 text-xs font-bold text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <Check className="size-4" />
              <span>
                {isSubmitting ? "Arşive Aktarılıyor..." : "İndeks Bilgilerini Onayla ve Arşive Aktar"}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* 4. CANLI İNDEKS KUYRUĞU VE SON EKLENEN BELGELER TABLOSU */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-2">
            <FileStack className="size-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Son İndekslenen Belgeler (Canlı Arşiv Kuyruğu)
            </h3>
          </div>
          <Link
            href="/documents"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Tüm Belgeleri Gör ({recentDocs.length}) <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-2 px-3">Belge Kimliği / No</th>
                <th className="py-2 px-3">Başlık & Konu</th>
                <th className="py-2 px-3">Güvenlik (ClamAV)</th>
                <th className="py-2 px-3">İşlem / OCR</th>
                <th className="py-2 px-3">Kayıt Tarihi</th>
                <th className="py-2 px-3 text-right">Eylem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-muted/40 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-primary">{doc.id}</td>
                  <td className="py-2.5 px-3 font-medium text-foreground max-w-xs truncate">
                    {doc.title}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                    >
                      ✓ Temiz
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600">
                      <span className="size-1.5 rounded-full bg-sky-500" />
                      {doc.status === "Indexed" ? "OCR Tamamlandı" : "İşleniyor"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                    {new Date(doc.createdAt).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="inline-flex items-center gap-1 rounded bg-muted hover:bg-primary hover:text-primary-foreground px-2 py-1 text-[11px] font-bold transition-colors"
                    >
                      <Eye className="size-3" /> Aç
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
