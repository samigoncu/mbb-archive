"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Globe,
  HardDrive,
  History,
  Layers,
  Mail,
  MapPin,
  Maximize2,
  MessageSquare,
  Minimize2,
  Paperclip,
  Printer,
  QrCode,
  RotateCw,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Tag,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type TreeNode = {
  id: string;
  name: string;
  type: "unit" | "series" | "folder" | "doc";
  code?: string;
  count?: number;
  barcode?: string;
  docCount?: number;
  pageCount?: number;
  children?: TreeNode[];
};

const SEARCH_TREE_DATA: TreeNode[] = [
  {
    id: "unit-1",
    name: "DİJİTAL ARŞİV BELGE BİLGİ TEKNOLOJİLERİ A.Ş.",
    type: "unit",
    children: [
      {
        id: "unit-2",
        name: "İHALE VE PROJELER DİREKTÖRLÜĞÜ",
        type: "unit",
        children: [
          {
            id: "series-1",
            name: "Bakım Destek Sözleşmeleri",
            type: "series",
            children: [
              {
                id: "folder-1",
                name: "50.1-2024-7",
                type: "folder",
                barcode: "50.1-2024-7",
                children: [
                  { id: "doc-1", name: "Ek Belgeler", type: "doc", pageCount: 4 },
                ],
              },
            ],
          },
          {
            id: "series-2",
            name: "İhale Dosyası",
            type: "series",
            children: [
              {
                id: "folder-2",
                name: "AP-2020-1",
                type: "folder",
                barcode: "AP-2020-1",
                children: [
                  { id: "doc-2", name: "DİLEKÇE", type: "doc", pageCount: 2 },
                  { id: "doc-3", name: "Sözleşme Taslağı-01", type: "doc", pageCount: 8 },
                  { id: "doc-4", name: "2021.09.182023.05.11", type: "doc", pageCount: 3 },
                  { id: "doc-5", name: "22336", type: "doc", pageCount: 5 },
                  { id: "doc-6", name: "2020.11.152023.05", type: "doc", pageCount: 6 },
                ],
              },
              {
                id: "folder-3",
                name: "AP-2021-1-01",
                type: "folder",
                barcode: "50.1-2024-8",
                children: [
                  { id: "doc-7", name: "Sözleşme Belgesi", type: "doc", pageCount: 17 },
                  { id: "doc-8", name: "Sözleşme Taslağı-01", type: "doc", pageCount: 12 },
                  { id: "doc-9", name: "2021.08.182023.05.112", type: "doc", pageCount: 4 },
                  { id: "doc-10", name: "22337", type: "doc", pageCount: 2 },
                ],
              },
              {
                id: "folder-4",
                name: "AP-2022-4",
                type: "folder",
                barcode: "AP-2022-4",
                children: [
                  { id: "doc-11", name: "Sözleşme Taslağı-01", type: "doc", pageCount: 9 },
                  { id: "doc-12", name: "YAZIŞMA", type: "doc", pageCount: 1 },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "unit-3",
        name: "MALİ İŞLER DİREKTÖRLÜĞÜ",
        type: "unit",
        children: [
          {
            id: "series-3",
            name: "Fatura Satış",
            type: "series",
            children: [
              {
                id: "folder-5",
                name: "APV2023000000004",
                type: "folder",
                barcode: "APV2023000000004",
                children: [
                  { id: "doc-13", name: "SATIŞ FATURASI", type: "doc", pageCount: 1 },
                  { id: "doc-14", name: "Tanımsız", type: "doc", pageCount: 2 },
                ],
              },
              {
                id: "folder-6",
                name: "APV2023000000011",
                type: "folder",
                barcode: "APV2023000000011",
                children: [
                  { id: "doc-15", name: "SATIŞ FATURASI", type: "doc", pageCount: 1 },
                  { id: "doc-16", name: "Tanımsız", type: "doc", pageCount: 1 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export function AdvancedSearchStudio() {
  // Ana Sekmeler (Screenshot 1: Dosya Arama | Evrak Arama | OCR ile Arama | Genel Arama)
  const [activeTab, setActiveTab] = useState<"dosya" | "evrak" | "ocr" | "genel">("dosya");

  // Arama yapıldı mı durumu (Screenshot 1: Henüz arama yapılmadı -> Screenshot 2/3: Sonuçlar)
  const [hasSearched, setHasSearched] = useState(false);

  // Form Alanları - Dosya Arama
  const [unitSelect, setUnitSelect] = useState("İHALE VE OPERASYON DİREKTÖRLÜĞÜ");
  const [seriesSelect, setSeriesSelect] = useState("İP -> Arşiv Projeleri");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [supplierInput, setSupplierInput] = useState("");
  const [supplierSuggestOpen, setSupplierSuggestOpen] = useState(false);
  const [authorizedInput, setAuthorizedInput] = useState("");
  const [yearInput, setYearInput] = useState("2024");
  const [jobNameInput, setJobNameInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [ocrSearchInput, setOcrSearchInput] = useState("");

  // Evrak Arama Alanları (Screenshot 4)
  const [docTemplate, setDocTemplate] = useState("Seçiniz");
  const [docUnit, setDocUnit] = useState("Arama Kriteri Seçiniz");
  const [docSeries, setDocSeries] = useState("Arama Kriteri Seçiniz");
  const [docType, setDocType] = useState("Arama Kriteri Seçiniz");
  const [docFullName, setDocFullName] = useState("");
  const [docJournalNo, setDocJournalNo] = useState("");

  // Sağ Panel Görüntüleyici Sekmesi: Belge Görüntüsü | OCR İçeriği | Haritada Gör | İndeks Alanları
  const [viewerTab, setViewerTab] = useState<"belge" | "ocr" | "harita" | "indeks">("belge");
  const [zoomLevel, setZoomLevel] = useState(92);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(17);

  // Mantıksal Operatör & Yakınında Arama (tarama.md Line 54 & 63)
  const [logicOperator, setLogicOperator] = useState<"VE" | "VEYA" | "YAKININDA">("VE");
  const [proximityWords, setProximityWords] = useState("5");

  // Ek Belge, Tarihçe, E-Posta ve Mesajlaşma Modalleri (tarama.md Line 51, 53, 55, 56)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);

  // Form State
  const [attachmentTitle, setAttachmentTitle] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [docNotesList, setDocNotesList] = useState([
    { id: "1", user: "Ali METE", date: "2024-03-04 10:20", text: "Darphane ihale sözleşmesi orijinal damgalı nüshadır. 1. ve 3. maddeler kontrol edildi." },
    { id: "2", user: "Ayşen KÜYÜK", date: "2024-03-04 11:15", text: "OCR metin katmanı Tesseract Türkçe ile %99.8 doğrulandı." },
  ]);

  // Seçili Evrak
  const [selectedDoc, setSelectedDoc] = useState<{
    id: string;
    name: string;
    folder: string;
    barcode: string;
  }>({
    id: "doc-7",
    name: "Sözleşme Belgesi",
    folder: "AP-2021-1-01",
    barcode: "50.1-2024-8",
  });

  // Ağaç düğüm açma/kapama durumu
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    "unit-1": true,
    "unit-2": true,
    "series-2": true,
    "folder-3": true,
  });

  function toggleNode(nodeId: string) {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  }

  function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setHasSearched(true);
    toast.success("Arama tamamlandı: 38 Evrak, 30 Barkod bulundu.");
  }

  function handleReset() {
    setBarcodeInput("");
    setSupplierInput("");
    setJobNameInput("");
    setTagInput("");
    setOcrSearchInput("");
    setHasSearched(false);
    toast.info("Arama kriterleri temizlendi.");
  }

  return (
    <div className="flex flex-col gap-3 font-sans text-xs">
      {/* 1. ÜST BREADCRUMB & ANA ARAMA SEKMELERİ (Screenshot 1 Menü Paritesi) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-semibold">
            <span className="rounded bg-sky-600 text-white px-2 py-0.5 text-[11px] font-mono">
              # Arama
            </span>
            <span className="rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[11px] font-mono capitalize">
              {activeTab === "dosya"
                ? "Dosya Arama"
                : activeTab === "evrak"
                ? "Evrak Arama"
                : activeTab === "ocr"
                ? "OCR ile Arama"
                : "Genel Arama"}
            </span>
          </div>

          {/* TEKRAR ARA BUTONU (Screenshot 2: Arama yapıldıktan sonra sol üstteki turuncu buton) */}
          {hasSearched && (
            <Button
              size="sm"
              onClick={handleReset}
              className="bg-[#f59e0b] hover:bg-[#d97706] text-white font-black text-xs h-7 px-3 shadow-xs"
            >
              TEKRAR ARA
            </Button>
          )}
        </div>

        {/* 4 ANA ARAMA SEKMESİ */}
        <div className="flex items-center gap-1 border-b border-border pb-1">
          {[
            { id: "dosya", label: "Dosya Arama" },
            { id: "evrak", label: "Evrak Arama" },
            { id: "ocr", label: "OCR ile Arama" },
            { id: "genel", label: "Genel Arama" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-[#f59e0b] text-white shadow-xs font-black"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. 3-PANEL DÜZENİ (Sol: Form, Orta: Bulunan Dosya Ağacı, Sağ: Belge Görüntüleyici) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[750px]">
        {/* ========================================================================= */}
        {/* PANEL 1: SOL ARAMA FORMU (Screenshot 1, 3 & 4 Paritesi)                 */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-3.5 shadow-xs flex flex-col gap-3 overflow-y-auto max-h-[820px]">
          {/* DOSYA ARAMA FORMU */}
          {activeTab === "dosya" && (
            <form onSubmit={handleSearch} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-border pb-1.5 bg-sky-600 -mx-3.5 -mt-3.5 p-2 rounded-t-xl text-white">
                <span className="font-bold text-xs">DOSYA ARAMA</span>
                <span className="text-[10px] opacity-80">MBB Arşiv v2.4</span>
              </div>

                            {/* Mantıksal Operatörler & Yakınında Arama (tarama.md Paritesi) */}
              <div className="flex flex-col gap-1 p-2 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold text-foreground">Arama Mantığı (Operatör)</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">VE / VEYA / YAKIN</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(["VE", "VEYA", "YAKININDA"] as const).map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setLogicOperator(op)}
                      className={`py-1 rounded text-center font-bold text-[11px] transition-all border ${
                        logicOperator === op
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {op === "VE" ? "VE (AND)" : op === "VEYA" ? "VEYA (OR)" : "Yakınında"}
                    </button>
                  ))}
                </div>
                {logicOperator === "YAKININDA" && (
                  <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-border/50 text-[10px]">
                    <span className="text-muted-foreground">Kelime Aralığı (Slop):</span>
                    <Input
                      type="number"
                      value={proximityWords}
                      onChange={(e) => setProximityWords(e.target.value)}
                      className="h-6 w-14 text-[10px] px-1"
                    />
                    <span className="text-muted-foreground">kelime</span>
                  </div>
                )}
              </div>

              {/* Birim Seçimi */}
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Birim Seçimi</Label>
                <div className="p-2 rounded bg-muted/50 border border-border text-xs font-semibold text-foreground truncate">
                  {unitSelect}
                </div>
              </div>

              {/* Dosya Serisi Seçimi */}
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">Dosya Serisi Seçimi</Label>
                <select
                  value={seriesSelect}
                  onChange={(e) => setSeriesSelect(e.target.value)}
                  className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="İP -> Arşiv Projeleri">İP -&gt; Arşiv Projeleri</option>
                  <option value="Bakım Destek Sözleşmeleri">Bakım Destek Sözleşmeleri</option>
                  <option value="Fatura Satış">Fatura Satış</option>
                  <option value="Personel Özlük">Personel Özlük</option>
                  <option value="Tüm Seriler">59 Seçili (Tüm Seriler)</option>
                </select>
              </div>

              {/* Barkod */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Barkod</Label>
                  <input type="checkbox" className="size-3.5 rounded border-border" />
                </div>
                <Input
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Örn: 50.1-2024-8"
                  className="h-7 text-xs"
                />
              </div>

              {/* MÜŞTERİ / TEDARİKÇİ (Screenshot 1: Auto-suggest DARP Dropdown Paritesi) */}
              <div className="flex flex-col gap-1 relative">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">MÜŞTERİ - TEDARİKÇİ</Label>
                  <input type="checkbox" className="size-3.5 rounded border-border" />
                </div>
                <Input
                  value={supplierInput}
                  onChange={(e) => {
                    setSupplierInput(e.target.value);
                    if (e.target.value.toLowerCase().includes("darp")) {
                      setSupplierSuggestOpen(true);
                    } else {
                      setSupplierSuggestOpen(false);
                    }
                  }}
                  onFocus={() => {
                    if (supplierInput.toLowerCase().includes("darp")) {
                      setSupplierSuggestOpen(true);
                    }
                  }}
                  placeholder="DARP..."
                  className="h-7 text-xs"
                />

                {/* Auto-suggest Popup (Screenshot 1 Birebir) */}
                {supplierSuggestOpen && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-lg border border-border bg-popover p-1 shadow-xl text-xs flex flex-col gap-0.5 animate-in fade-in">
                    {[
                      "Darphane Ve Damga Matbaası Genel Müdürlüğü",
                      "darphane",
                      "DARPHANE",
                      "dARPHANE",
                    ].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setSupplierInput(item);
                          setSupplierSuggestOpen(false);
                        }}
                        className="text-left px-2.5 py-1.5 rounded hover:bg-muted font-medium text-foreground transition-colors"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ÜRÜN - HİZMET KONUSU */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">ÜRÜN - HİZMET KONUSU</Label>
                  <input type="checkbox" className="size-3.5 rounded border-border" />
                </div>
                <Input placeholder="" className="h-7 text-xs" />
              </div>

              {/* ADI SOYADI */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">ADI SOYADI</Label>
                  <input type="checkbox" className="size-3.5 rounded border-border" />
                </div>
                <Input placeholder="" className="h-7 text-xs" />
              </div>

              {/* Yetkili */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Yetkili</Label>
                  <input type="checkbox" className="size-3.5 rounded border-border" />
                </div>
                <Input
                  value={authorizedInput}
                  onChange={(e) => setAuthorizedInput(e.target.value)}
                  placeholder=""
                  className="h-7 text-xs"
                />
              </div>

              {/* Yıl */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Yıl</Label>
                  <input type="checkbox" className="size-3.5 rounded border-border" />
                </div>
                <Input
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  placeholder="2024"
                  className="h-7 text-xs"
                />
              </div>

              {/* İşin Adı */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">İşin Adı</Label>
                  <input type="checkbox" className="size-3.5 rounded border-border" />
                </div>
                <Input
                  value={jobNameInput}
                  onChange={(e) => setJobNameInput(e.target.value)}
                  placeholder=""
                  className="h-7 text-xs"
                />
              </div>

              {/* Etiket */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-muted-foreground">Etiket</Label>
                  <input type="checkbox" className="size-3.5 rounded border-border" />
                </div>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder=""
                  className="h-7 text-xs"
                />
              </div>

              {/* OCR İçeriği */}
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] font-semibold text-muted-foreground">OCR İçeriği</Label>
                <Input
                  value={ocrSearchInput}
                  onChange={(e) => setOcrSearchInput(e.target.value)}
                  placeholder="Metin içinde ara..."
                  className="h-7 text-xs"
                />
              </div>

              {/* Temizle & Ara Butonları (Screenshot 1: Sol Kırmızı Temizle, Sağ Mavi Ara) */}
              <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 text-xs font-bold px-4 bg-red-600 hover:bg-red-700 text-white"
                >
                  Temizle
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs font-bold px-5 bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
                >
                  Ara
                </Button>
              </div>
            </form>
          )}

          {/* EVRAK ARAMA FORMU (Screenshot 4 Paritesi) */}
          {activeTab === "evrak" && (
            <form onSubmit={handleSearch} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-border pb-1.5 bg-sky-600 -mx-3.5 -mt-3.5 p-2 rounded-t-xl text-white">
                <span className="font-bold text-xs">BELGE ARAMA</span>
                <span className="text-[10px] opacity-80">MBB Arşiv</span>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toast.info("Excel ile arama şablonu indirildi.")}
                  className="text-red-500 hover:underline font-bold text-[11px]"
                >
                  Excel İle Ara İndir
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground">Arama Şablonu</Label>
                <select
                  value={docTemplate}
                  onChange={(e) => setDocTemplate(e.target.value)}
                  className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground"
                >
                  <option value="Seçiniz">Seçiniz</option>
                  <option value="İhale Evrakları">İhale Evrakları</option>
                  <option value="Mali Belgeler">Mali Belgeler</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground">Birimler</Label>
                <select
                  value={docUnit}
                  onChange={(e) => setDocUnit(e.target.value)}
                  className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground"
                >
                  <option value="Arama Kriteri Seçiniz">Arama Kriteri Seçiniz</option>
                  <option value="İHALE VE PROJELER DİREKTÖRLÜĞÜ">İHALE VE PROJELER DİREKTÖRLÜĞÜ</option>
                  <option value="MALİ İŞLER DİREKTÖRLÜĞÜ">MALİ İŞLER DİREKTÖRLÜĞÜ</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground">Belge Serisi</Label>
                <select
                  value={docSeries}
                  onChange={(e) => setDocSeries(e.target.value)}
                  className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground"
                >
                  <option value="Arama Kriteri Seçiniz">Arama Kriteri Seçiniz</option>
                  <option value="İhale Dosyası">İhale Dosyası</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground">Belge Türü</Label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground"
                >
                  <option value="Arama Kriteri Seçiniz">Arama Kriteri Seçiniz</option>
                  <option value="Sözleşmeler">Sözleşmeler</option>
                  <option value="Birim Fiyat Teklifi">Birim Fiyat Teklifi</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Ad Soyad</Label>
                  <input type="checkbox" className="size-3 rounded border-border" />
                </div>
                <Input
                  value={docFullName}
                  onChange={(e) => setDocFullName(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">YEVMİYE NO</Label>
                  <input type="checkbox" className="size-3 rounded border-border" />
                </div>
                <Input
                  value={docJournalNo}
                  onChange={(e) => setDocJournalNo(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border mt-1">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 text-xs font-bold px-4 bg-red-600 hover:bg-red-700 text-white"
                >
                  Temizle
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  className="h-8 text-xs font-bold px-5 bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
                >
                  Ara
                </Button>
              </div>
            </form>
          )}

          {["ocr", "genel"].includes(activeTab) && (
            <div className="flex flex-col gap-3">
              <span className="font-bold text-foreground">Tam Metin & OCR Arama</span>
              <Input placeholder="Belge içerisindeki herhangi bir kelime..." className="h-8 text-xs" />
              <Button onClick={() => handleSearch()} className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-8">
                Ara
              </Button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* PANEL 2: ORTA PANEL (BULUNAN DOSYA / BULUNAN BELGE)                      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-3 shadow-xs flex flex-col gap-2 overflow-y-auto max-h-[820px]">
          <div className="flex items-center justify-between border-b border-border pb-1.5 bg-sky-600 -mx-3 -mt-3 p-2 rounded-t-xl text-white">
            <span className="font-bold text-xs">BULUNAN DOSYA</span>
          </div>

          {!hasSearched ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground text-xs">
              Henüz bir arama yapmadınız..
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Sayaçlar (Screenshot 2: Evrak Sayısı: 38, Barkod Sayısı: 30) */}
              <div className="flex items-center justify-between p-2 rounded bg-muted/40 text-xs font-bold border border-border">
                <span className="text-foreground">Evrak Sayısı: 38</span>
                <span className="text-sky-600">Barkod Sayısı: 30</span>
              </div>

              {/* Hiyerarşik Ağaç Görünümü (Screenshot 2 & 3 Birebir Paritesi) */}
              <div className="flex flex-col gap-1 text-[11px] overflow-x-auto">
                {SEARCH_TREE_DATA.map((unit) => (
                  <div key={unit.id} className="flex flex-col">
                    <div
                      onClick={() => toggleNode(unit.id)}
                      className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-muted cursor-pointer font-bold text-foreground"
                    >
                      {expandedNodes[unit.id] ? (
                        <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                      )}
                      <Building2 className="size-3.5 text-sky-600 shrink-0" />
                      <span className="truncate">{unit.name}</span>
                    </div>

                    {expandedNodes[unit.id] && (
                      <div className="pl-4 flex flex-col border-l border-border ml-2">
                        {unit.children?.map((subUnit) => (
                          <div key={subUnit.id} className="flex flex-col">
                            <div
                              onClick={() => toggleNode(subUnit.id)}
                              className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-muted cursor-pointer font-semibold text-foreground"
                            >
                              {expandedNodes[subUnit.id] ? (
                                <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                              )}
                              <Folder className="size-3.5 text-amber-500 shrink-0" />
                              <span className="truncate">{subUnit.name}</span>
                            </div>

                            {expandedNodes[subUnit.id] && (
                              <div className="pl-4 flex flex-col border-l border-border ml-2">
                                {subUnit.children?.map((series) => (
                                  <div key={series.id} className="flex flex-col">
                                    <div
                                      onClick={() => toggleNode(series.id)}
                                      className="flex items-center gap-1.5 py-0.5 px-1.5 rounded hover:bg-muted cursor-pointer font-medium text-muted-foreground"
                                    >
                                      {expandedNodes[series.id] ? (
                                        <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                                      ) : (
                                        <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                                      )}
                                      <Layers className="size-3 text-primary shrink-0" />
                                      <span className="truncate">{series.name}</span>
                                    </div>

                                    {expandedNodes[series.id] && (
                                      <div className="pl-4 flex flex-col border-l border-border ml-2">
                                        {series.children?.map((folder) => (
                                          <div key={folder.id} className="flex flex-col">
                                            <div
                                              onClick={() => toggleNode(folder.id)}
                                              className="flex items-center gap-1.5 py-0.5 px-1.5 rounded hover:bg-muted cursor-pointer font-mono font-bold text-sky-600"
                                            >
                                              {expandedNodes[folder.id] ? (
                                                <ChevronDown className="size-3 text-muted-foreground shrink-0" />
                                              ) : (
                                                <ChevronRight className="size-3 text-muted-foreground shrink-0" />
                                              )}
                                              <FolderOpen className="size-3 text-amber-500 shrink-0" />
                                              <span className="truncate">{folder.name}</span>
                                            </div>

                                            {expandedNodes[folder.id] && (
                                              <div className="pl-4 flex flex-col border-l border-border ml-2 gap-0.5">
                                                {folder.children?.map((doc) => {
                                                  const isSelected = selectedDoc.id === doc.id;
                                                  return (
                                                    <div
                                                      key={doc.id}
                                                      onClick={() =>
                                                        setSelectedDoc({
                                                          id: doc.id,
                                                          name: doc.name,
                                                          folder: folder.name,
                                                          barcode: folder.barcode || "50.1-2024-8",
                                                        })
                                                      }
                                                      className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors ${
                                                        isSelected
                                                          ? "bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold"
                                                          : "hover:bg-muted/50 text-foreground"
                                                      }`}
                                                    >
                                                      <div className="flex items-center gap-1.5 truncate">
                                                        <FileText className="size-3 text-muted-foreground shrink-0" />
                                                        <span className="truncate">{doc.name}</span>
                                                      </div>
                                                      <span className="text-[10px] text-muted-foreground font-mono">
                                                        {doc.pageCount}s
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* PANEL 3: SAĞ PANEL (BELGE GÖRÜNTÜLEYİCİ & OCR & HARİTA)                   */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 rounded-xl border border-border bg-card p-3 shadow-xs flex flex-col gap-2 max-h-[820px]">
          {/* Üst 4 Görüntüleyici Sekmesi (Screenshot 1 & 2: Belge Görüntüsü | OCR İçeriği | Haritada Gör | İndeks Alanları) */}
          <div className="flex items-center gap-1 border-b border-border pb-1">
            {[
              { id: "belge", label: "Belge Görüntüsü" },
              { id: "ocr", label: "OCR İçeriği" },
              { id: "harita", label: "Haritada Gör" },
              { id: "indeks", label: "İndeks Alanları" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewerTab(tab.id as any)}
                className={`px-3.5 py-1 text-xs font-bold rounded-t-lg transition-colors ${
                  viewerTab === tab.id
                    ? "bg-[#f59e0b] text-white shadow-xs font-black"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!hasSearched ? (
            <div className="flex-1 flex items-center justify-center p-12 text-center text-muted-foreground text-xs">
              Henüz bir arama yapmadınız..
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              {/* Belge Ribbon Butonları (Screenshot 2 & 3 Birebir MBB Arşiv Ribbon Paritesi) */}
              <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border pb-2 bg-muted/20 p-1.5 rounded-lg">
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info(`${selectedDoc.folder} klasörünün tüm evrakları listeleniyor.`)}
                    className="h-7 text-[11px] bg-sky-600 text-white hover:bg-sky-700 font-bold border-none"
                  >
                    Dosyasından Ara
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.success(`"${selectedDoc.name}" için ödünç talebi oluşturuldu.`)}
                    className="h-7 text-[11px] bg-sky-600 text-white hover:bg-sky-700 font-bold border-none"
                  >
                    Ödünç İste
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info("PDF Editör açılıyor...")}
                    className="h-7 text-[11px] bg-sky-600 text-white hover:bg-sky-700 font-bold border-none"
                  >
                    PDF Editörde Aç
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info("Kalite kontrol modülü devrede.")}
                    className="h-7 text-[11px] bg-sky-600 text-white hover:bg-sky-700 font-bold border-none"
                  >
                    Kalite Kontrolde Aç
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info("Belge 90° döndürüldü.")}
                    className="h-7 text-[11px] bg-sky-600 text-white hover:bg-sky-700 font-bold border-none"
                  >
                    Tekrar Çevir
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.success(`${selectedDoc.name}.pdf indirildi.`)}
                    className="h-7 text-[11px] bg-sky-600 text-white hover:bg-sky-700 font-bold border-none"
                  >
                    İndir
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.success(`Klasör ${selectedDoc.folder}.zip olarak indirildi.`)}
                    className="h-7 text-[11px] bg-sky-600 text-white hover:bg-sky-700 font-bold border-none"
                  >
                    Dosyayı İndir
                  </Button>

                                    <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAttachmentModalOpen(true)}
                    className="h-7 text-[11px] bg-emerald-600 text-white hover:bg-emerald-700 font-bold border-none gap-1"
                  >
                    <Paperclip className="size-3" />
                    <span>Ek Belge Ekle</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="h-7 text-[11px] bg-slate-700 text-white hover:bg-slate-800 font-bold border-none gap-1"
                  >
                    <History className="size-3" />
                    <span>Belge Tarihçesi</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEmailSubject(`[MBB Arşiv] ${selectedDoc.name} - ${selectedDoc.barcode}`);
                      setIsEmailModalOpen(true);
                    }}
                    className="h-7 text-[11px] bg-sky-700 text-white hover:bg-sky-800 font-bold border-none gap-1"
                  >
                    <Mail className="size-3" />
                    <span>E-Posta Gönder</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsNotesModalOpen(true)}
                    className="h-7 text-[11px] bg-amber-600 text-white hover:bg-amber-700 font-bold border-none gap-1"
                  >
                    <MessageSquare className="size-3" />
                    <span>Notlar ({docNotesList.length})</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toast.info("Güvenli dijital paylaşım bağlantısı kopyalandı.")}
                    className="h-7 text-[11px] bg-sky-600 text-white hover:bg-sky-700 font-bold border-none"
                  >
                    Dijital Paylaş
                  </Button>
                </div>

                <span className="text-[11px] font-semibold text-muted-foreground">
                  *Özet Bilgi
                </span>
              </div>

              {/* 1. BELGE GÖRÜNTÜSÜ (Screenshot 3 Birebir Sözleşme Görünümü) */}
              {viewerTab === "belge" && (
                <div className="flex-1 flex flex-col rounded-lg border border-border bg-slate-900 text-slate-100 overflow-hidden">
                  {/* PDF Viewer Header Toolbar (Screenshot 3: pview.aspx | 1/17 | 92% | vb.) */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-slate-300">pview.aspx</span>
                      <span className="text-slate-500">|</span>
                      <span className="font-mono text-slate-200">
                        {currentPage} / {totalPages}
                      </span>
                      <span className="text-slate-500">|</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                          className="size-5 rounded hover:bg-slate-700 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="font-mono text-[11px]">{zoomLevel}%</span>
                        <button
                          type="button"
                          onClick={() => setZoomLevel((z) => Math.min(200, z + 10))}
                          className="size-5 rounded hover:bg-slate-700 flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toast.info("Belge sayfaya sığdırıldı.")}
                        className="size-6 rounded hover:bg-slate-700 flex items-center justify-center text-slate-300"
                        title="Sayfaya Sığdır"
                      >
                        <Maximize2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.info("Sayfa 90 derece döndürüldü.")}
                        className="size-6 rounded hover:bg-slate-700 flex items-center justify-center text-slate-300"
                        title="Döndür"
                      >
                        <RotateCw className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          window.print();
                          toast.success("Belge yazıcıya gönderiliyor.");
                        }}
                        className="size-6 rounded hover:bg-slate-700 flex items-center justify-center text-slate-300"
                        title="Yazdır"
                      >
                        <Printer className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Belge Gövdesi (Sol Thumbnails + Sağ Orijinal Sözleşme Belgesi) */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Sol Sayfa Önizleme Küçük Resimleri (Thumbnails) */}
                    <div className="w-20 bg-slate-950 border-r border-slate-800 p-2 flex flex-col gap-2 overflow-y-auto">
                      {[1, 2, 3, 4, 5].map((page) => (
                        <div
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`cursor-pointer rounded p-1 flex flex-col items-center gap-1 transition-all ${
                            currentPage === page ? "ring-2 ring-sky-500 bg-slate-800" : "hover:bg-slate-900"
                          }`}
                        >
                          <div className="w-12 h-16 bg-white text-black text-[6px] p-1 shadow-sm overflow-hidden flex flex-col gap-0.5">
                            <div className="h-1 bg-slate-800 w-full" />
                            <div className="h-0.5 bg-slate-400 w-3/4" />
                            <div className="h-0.5 bg-slate-300 w-full" />
                            <div className="h-0.5 bg-slate-300 w-5/6" />
                            <div className="h-0.5 bg-slate-300 w-2/3" />
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{page}</span>
                        </div>
                      ))}
                    </div>

                    {/* Ana Belge Sayfası (Screenshot 3 Sözleşme Birebir Görünümü) */}
                    <div className="flex-1 p-4 overflow-y-auto flex justify-center bg-slate-800">
                      <div
                        className="w-full max-w-xl bg-white text-black p-8 shadow-2xl rounded font-serif text-[11px] leading-relaxed transition-transform origin-top"
                        style={{ transform: `scale(${zoomLevel / 100})` }}
                      >
                        <div className="text-center font-bold text-sm tracking-wide mb-6 border-b border-black pb-3">
                          FİZİKSEL VE DİJİTAL ARŞİV PROJESİ SÖZLEŞMESİ
                        </div>

                        <div className="mb-4">
                          <strong className="block font-bold">Madde 1- Sözleşmenin Tarafları</strong>
                          <p className="mt-1 text-justify">
                            Bu sözleşme, bir tarafta <strong>Darphane ve Damga Matbaası Genel Müdürlüğü</strong> (bundan sonra “İdare” olarak anılacaktır) ile diğer tarafta <strong>Dijital Arşiv Belge Bilgi Teknolojileri San.Tic.A.Ş.</strong> (bundan sonra “Yüklenici” olarak anılacaktır) arasında aşağıda yazılı şartlar dahilinde akdedilmiştir.
                          </p>
                        </div>

                        <div className="mb-4">
                          <strong className="block font-bold">Madde 2- Taraflara İlişkin Bilgiler</strong>
                          <div className="pl-3 mt-1 space-y-1">
                            <div><strong>2.1. İdarenin</strong></div>
                            <div>a) Adı: <strong>DARPHANE VE DAMGA MATBAASI GENEL MÜDÜRLÜĞÜ</strong></div>
                            <div>b) Adresi: Dikilitaş Mah. Yenidoğan Sok. No: 55 Beşiktaş / İSTANBUL</div>
                            <div>c) Telefon numarası: 0212 370 90 00</div>
                            <div>d) Elektronik Posta Adresi: hakan.ozel@darphane.gov.tr</div>

                            <div className="pt-2"><strong>2.2. Yüklenicinin</strong></div>
                            <div>a) Adı ve soyadı/Ticaret Unvanı: <strong>Dijital Arşiv Belge Bilgi Teknolojileri San.Tic.A.Ş.</strong></div>
                            <div>b) T.C. Kimlik No: —</div>
                            <div>c) Vergi Kimlik No: Üsküdar V.D. 295 093 5318</div>
                            <div>ç) Yüklenicinin tebligata esas adresi: Selami Ali Mah. Cumhuriyet Cad. No:30/2 Fıstıkağacı-Üsküdar / İSTANBUL</div>
                            <div>d) Telefon numarası: 0216 492 75 75</div>
                          </div>
                        </div>

                        <div className="mb-4">
                          <strong className="block font-bold">Madde 3- Sözleşmenin konusu işin tanımı</strong>
                          <p className="mt-1 text-justify">
                            <strong>3.1.</strong> Sözleşme Konusu İş; <strong>12.000 adet klasör</strong> ve içinde <strong>3.500.000 sayfa</strong> fiziksel evrakın arşivlenmesi, dijital ortamda yeniden düzenlenmiş ve son aşama olarak klasörlerin etiketlenme işlemi de yapılarak; teknik şartname ve sözleşme hükümlerine uygun olarak tamamlanması hizmeti alımı.
                          </p>
                        </div>

                        <div className="mt-8 pt-4 border-t border-black flex justify-between text-center font-bold text-xs">
                          <div>
                            İDARE<br />
                            Darphane ve Damga Matbaası<br />
                            Genel Müdürlüğü
                          </div>
                          <div>
                            YÜKLENİCİ<br />
                            Dijital Arşiv Belge Bilgi<br />
                            Teknolojileri San.Tic.A.Ş.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. OCR İÇERİĞİ (Metin Arama ve İndeks) */}
              {viewerTab === "ocr" && (
                <div className="flex-1 rounded-lg border border-border bg-card p-4 overflow-y-auto font-mono text-xs leading-relaxed">
                  <div className="flex items-center justify-between pb-2 border-b border-border mb-3">
                    <span className="font-bold text-foreground">Tesseract OCR v5.3 Metin Katmanı</span>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                      %99.8 Doğruluk Oranı
                    </Badge>
                  </div>
                  <div className="p-3 bg-muted/30 rounded border border-border">
                    <p className="font-bold">FİZİKSEL VE DİJİTAL ARŞİV PROJESİ SÖZLEŞMESİ</p>
                    <p className="mt-2">Madde 1- Sözleşmenin Tarafları: Darphane ve Damga Matbaası Genel Müdürlüğü ... Dijital Arşiv Belge Bilgi Teknolojileri San.Tic.A.Ş.</p>
                    <p className="mt-2">Madde 2- İdare Adresi: Dikilitaş Mah. Yenidoğan Sok. No: 55 Beşiktaş / İSTANBUL | Tel: 0212 370 90 00</p>
                    <p className="mt-2">Yüklenici: Selami Ali Mah. Cumhuriyet Cad. No:30/2 Üsküdar / İSTANBUL | V.D: 295 093 5318</p>
                    <p className="mt-2">Madde 3- 12.000 adet klasör ve 3.500.000 sayfa fiziksel evrakın dijitalleştirilmesi ve tasnifi.</p>
                  </div>
                </div>
              )}

              {/* 3. HARİTADA GÖR (Fiziksel Arşiv Depo ve Raf Konumu) */}
              {viewerTab === "harita" && (
                <div className="flex-1 rounded-lg border border-border bg-card p-4 flex flex-col items-center justify-center gap-3 text-center">
                  <MapPin className="size-10 text-rose-500 animate-bounce" />
                  <span className="font-bold text-sm text-foreground">Fiziksel Konum: Malatya Merkez Kurum Arşivi (Kat -1)</span>
                  <div className="p-3 bg-muted/40 rounded-lg border border-border flex items-center gap-4 text-xs font-mono">
                    <span>Oda: <strong>Depo-A</strong></span>
                    <span>Dolap: <strong>Kompakt 14</strong></span>
                    <span>Raf: <strong>R-03</strong></span>
                    <span>Kutu: <strong>K-08</strong></span>
                    <span>Barkod: <strong>50.1-2024-8</strong></span>
                  </div>
                </div>
              )}

              {/* 4. İNDEKS ALANLARI */}
              {viewerTab === "indeks" && (
                <div className="flex-1 rounded-lg border border-border bg-card p-4 overflow-y-auto text-xs">
                  <h4 className="font-bold text-foreground mb-3 pb-1 border-b border-border">Belge ve Dosya İndeks Üstverileri</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 rounded bg-muted/20 border border-border">
                      <span className="text-muted-foreground block text-[10px]">Dosya Barkodu</span>
                      <span className="font-mono font-bold text-sky-600">50.1-2024-8</span>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border border-border">
                      <span className="text-muted-foreground block text-[10px]">Birim</span>
                      <span className="font-semibold text-foreground">İhale ve Projeler Direktörlüğü</span>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border border-border">
                      <span className="text-muted-foreground block text-[10px]">Seri</span>
                      <span className="font-semibold text-foreground">İhale Dosyası (İHL)</span>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border border-border">
                      <span className="text-muted-foreground block text-[10px]">Belge Adı</span>
                      <span className="font-semibold text-foreground">Sözleşme Belgesi</span>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border border-border">
                      <span className="text-muted-foreground block text-[10px]">Müşteri / Tedarikçi</span>
                      <span className="font-semibold text-foreground">Darphane ve Damga Matbaası Genel Müdürlüğü</span>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border border-border">
                      <span className="text-muted-foreground block text-[10px]">Yıl</span>
                      <span className="font-mono font-bold text-foreground">2024</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* ========================================================================= */}
      {/* MODAL 1: BELGE TARİHÇESİ (tarama.md Line 50 & 51 - WORM & Audit Trail)     */}
      {/* ========================================================================= */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">Belge Tarihçesi & Değiştirilemezlik Kaydı</h3>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* WORM ve Değiştirilemezlik Rozeti (tarama.md Line 50) */}
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-3">
              <ShieldCheck className="size-6 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 block">
                  WORM Korumalı Orijinal Belge (Değiştirilemez)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Bu belgenin orijinal imajı ve kriptografik hash özeti 5070 Sayılı Elektronik İmza Kanunu gereği salt-okunur olarak kilitlenmiştir.
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1 font-mono text-[11px] p-2.5 rounded bg-muted/40 border border-border">
              <div><span className="text-muted-foreground">Belge Adı:</span> <strong>{selectedDoc.name}</strong></div>
              <div><span className="text-muted-foreground">Klasör / Barkod:</span> <strong>{selectedDoc.barcode}</strong></div>
              <div><span className="text-muted-foreground">SHA-256 Özeti:</span> <span className="text-sky-600 font-mono">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span></div>
            </div>

            {/* Zaman Çizelgesi */}
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              <span className="font-bold text-foreground">Tarihçe ve İşlem Adımları:</span>
              {[
                { time: "2024-03-04 10:15", user: "Ali METE (Arşiv Operatörü)", title: "Evrak Tarandı & Sisteme Yüklendi", detail: "Fujitsu fi-7160 ile 300 DPI gri tonlamalı tarandı." },
                { time: "2024-03-04 10:17", user: "Sistem (Tesseract v5.3)", title: "Türkçe OCR Metin Katmanı Çıkarıldı", detail: "Metin doğruluğu %99.8, 1D/QR barkod çözümlendi." },
                { time: "2024-03-04 10:25", user: "Ayşen KÜYÜK (Kalite Kontrol)", title: "Kalite Kontrol Onaylandı", detail: "Eğrilik düzeltme ve kenar temizliği teyit edildi." },
                { time: "2024-03-04 11:00", user: "Sami GÖNCÜ (Arşiv Uzmanı)", title: "SDP 755.02.01 Tasnif Koduna Bağlandı", detail: "İhale Dosyası serisi AP-2021-1-01 klasörüne yerleştirildi." },
              ].map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-2 rounded border border-border bg-muted/20">
                  <div className="size-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{step.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{step.time}</span>
                    </div>
                    <span className="text-[11px] text-primary font-medium">{step.user}</span>
                    <span className="text-[10px] text-muted-foreground">{step.detail}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setIsHistoryModalOpen(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EK BELGE KAYDETME (tarama.md Line 53)                            */}
      {/* ========================================================================= */}
      {isAttachmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="size-4 text-emerald-600" />
                <h3 className="text-base font-bold text-foreground">Seçilen Belgeye Ek Belge Kaydet</h3>
              </div>
              <button
                onClick={() => setIsAttachmentModalOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-muted-foreground text-[11px]">
              <strong>{selectedDoc.name}</strong> belgesine zeyilname, tebligat alındısı veya ek protokol ekleyin.
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Ek Belge Başlığı *</Label>
                <Input
                  value={attachmentTitle}
                  onChange={(e) => setAttachmentTitle(e.target.value)}
                  placeholder="Örn: Sözleşme Zeyilnamesi - Ek-1"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Dosya Seç (PDF, TIFF, Resim) *</Label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.tiff"
                  className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (!attachmentTitle.trim()) {
                      toast.error("Lütfen ek belge başlığı giriniz.");
                      return;
                    }
                    toast.success(`Ek belge "${attachmentTitle}" başarıyla kaydedildi ve dosyaya iliştirildi.`);
                    setIsAttachmentModalOpen(false);
                    setAttachmentTitle("");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Ek Belgeyi Kaydet
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsAttachmentModalOpen(false)}>
                  Vazgeç
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: E-POSTA İLE GÖNDER (tarama.md Line 55)                           */}
      {/* ========================================================================= */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-sky-600" />
                <h3 className="text-base font-bold text-foreground">Belgeyi E-Posta ile Gönder</h3>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Alıcı E-Posta Adresi *</Label>
                <Input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="yetkili@belediye.gov.tr"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Konu *</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="MBB Arşiv Belge Paylaşımı"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">İleti / Not</Label>
                <textarea
                  rows={3}
                  value={emailNote}
                  onChange={(e) => setEmailNote(e.target.value)}
                  placeholder="Sayın Yetkili, talep ettiğiniz arşiv belgesi ektedir..."
                  className="p-2 rounded border border-border bg-background text-xs"
                />
              </div>

              <div className="p-2 rounded bg-muted/40 border border-border flex items-center justify-between">
                <span className="font-medium text-foreground">Ek: {selectedDoc.name}.pdf (17 Sayfa)</span>
                <Badge variant="outline" className="text-sky-600 font-mono text-[10px]">PDF Eklendi</Badge>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button
                  size="sm"
                  onClick={() => {
                    if (!emailTo.trim()) {
                      toast.error("Lütfen alıcı e-posta adresini giriniz.");
                      return;
                    }
                    toast.success(`"${selectedDoc.name}" belgesi ${emailTo} adresine gönderildi.`);
                    setIsEmailModalOpen(false);
                    setEmailTo("");
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1"
                >
                  <Send className="size-3.5" />
                  <span>E-Postayı Gönder</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsEmailModalOpen(false)}>
                  Vazgeç
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: KURUM İÇİ MESAJLAŞMA / NOTLAR (tarama.md Line 56)                */}
      {/* ========================================================================= */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-amber-600" />
                <h3 className="text-base font-bold text-foreground">Belge İçi Notlar & Operatör Mesajlaşması</h3>
              </div>
              <button
                onClick={() => setIsNotesModalOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {docNotesList.map((n) => (
                <div key={n.id} className="p-2.5 rounded-lg border border-border bg-muted/20 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{n.user}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{n.date}</span>
                  </div>
                  <p className="text-[11px] text-foreground/90">{n.text}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
              <Label className="font-semibold text-foreground">Yeni Not Ekle</Label>
              <div className="flex gap-1.5">
                <Input
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Bu belge hakkında çalışma arkadaşlarınız için not bırakın..."
                  className="text-xs h-8 flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (!internalNote.trim()) return;
                    setDocNotesList((prev) => [
                      ...prev,
                      {
                        id: `note-${Date.now()}`,
                        user: "Mevcut Kullanıcı",
                        date: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
                        text: internalNote,
                      },
                    ]);
                    setInternalNote("");
                    toast.success("Not belgeye eklendi.");
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-8"
                >
                  Ekle
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setIsNotesModalOpen(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
