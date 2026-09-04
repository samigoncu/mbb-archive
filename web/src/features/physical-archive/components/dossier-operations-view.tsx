"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  FolderPlus,
  FolderTree,
  Home,
  Layers,
  MapPin,
  Maximize2,
  Printer,
  QrCode,
  RotateCw,
  Search,
  Share2,
  SlidersHorizontal,
  Square,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LocationPicker } from "@/features/physical-archive/components/location-picker";
import type { FolderListItem } from "@/features/physical-archive/model/folder";
import type { LocationListItem } from "@/features/physical-archive/model/location";

// MBB Arşiv Seriler Hiyerarşisi
export type SeriesNode = {
  id: string;
  name: string;
  count?: number;
  children?: SeriesNode[];
};

const DEFAULT_SERIES_TREE: SeriesNode[] = [
  { id: "bakim", name: "Bakım / Onarım Sözleşmeleri", count: 12 },
  { id: "d-corebia", name: "d-CoreBia Otomasyonu", count: 8 },
  { id: "d-coreebrys", name: "d-CoreEBRYS Otomasyonu", count: 15 },
  { id: "d-coremedia", name: "d-CoreMedia Otomasyonu", count: 4 },
  { id: "mbb-arsiv", name: "Kurumsal Arşiv Otomasyonu", count: 24 },
  { id: "destek", name: "Destek Servisi", count: 7 },
  { id: "donanim", name: "Donanım", count: 5 },
  { id: "d-scanpro", name: "d-ScanPro Otomasyonu", count: 18 },
  { id: "d-ytscore", name: "d-YTSCore Otomasyonu", count: 9 },
  {
    id: "dis-iliskiler",
    name: "DIŞ İLİŞKİLER DİREKTÖRLÜĞÜ",
    children: [
      { id: "ihracat", name: "İhracat Dosyaları", count: 14 },
      { id: "ithalat", name: "İthalat Dosyaları", count: 22 },
    ],
  },
  {
    id: "emlak",
    name: "EMLAK VE GAYRİMENKUL DİREKTÖRLÜĞÜ",
    children: [{ id: "emlak-dosyasi", name: "Emlak Dosyası", count: 35 }],
  },
  {
    id: "genel-yonetim",
    name: "GENEL YÖNETİM İŞLERİ",
    children: [
      { id: "kurul-toplanti", name: "Kurul ve Toplantılar", count: 19 },
      { id: "mevzuat", name: "Mevzuat Dosyası", count: 11 },
      { id: "protokol", name: "Protokol ve Sözleşme Dosyası", count: 42 },
    ],
  },
  {
    id: "hukuk",
    name: "HUKUK İŞLERİ DİREKTÖRLÜĞÜ",
    children: [
      { id: "dava", name: "Dava Dosyası", count: 68 },
      { id: "icra", name: "İcra Dosyası", count: 53 },
      { id: "uzlasma", name: "Uzlaşma Sulh Dosyası", count: 16 },
      { id: "vekaletname", name: "Vekaletname & Azilname", count: 31 },
    ],
  },
  {
    id: "idari-sosyal",
    name: "İDARİ VE SOSYAL İŞLER DİREKTÖRLÜĞÜ",
    children: [
      { id: "abone", name: "Abone Dosyası", count: 27 },
      { id: "arac", name: "Araç", count: 18 },
      { id: "danismanlik", name: "Danışmanlık ve Eğitim Hizmetleri", count: 14 },
      { id: "teftis", name: "Teftiş & Denetim", count: 9 },
      { id: "gelen-teklifler", name: "Gelen Teklifler - Yazı", count: 37 },
      { id: "kalem", name: "Kalem (Gelen - Giden) Dosyası", count: 45 },
    ],
  },
  {
    id: "ihale-operasyon",
    name: "İHALE VE OPERASYON DİREKTÖRLÜĞÜ",
    children: [
      { id: "arsiv-projeleri", name: "Arşiv Projeleri", count: 54 },
      { id: "dogrudan-temin", name: "Doğrudan Temin Dosyası", count: 32 },
      { id: "ihale-dosyasi", name: "İhale Dosyası", count: 41 },
      { id: "kutuphane-projeleri", name: "Kütüphane Projeleri", count: 19 },
      { id: "medya-projeleri", name: "Medya Projeleri", count: 15 },
    ],
  },
  {
    id: "insan-kaynaklari",
    name: "İNSAN KAYNAKLARI DİREKTÖRLÜĞÜ",
    children: [{ id: "personel-ozluk", name: "Personel Özlük Dosyası", count: 86 }],
  },
];

const EVRAK_TIPLERI_LIST = [
  "BİRİM FİYAT TEKLİFİ",
  "DİĞER",
  "DİLEKÇE",
  "Dilekçe - Talep Yazısı",
  "Ek Belgeler",
  "Fatura",
  "Fizibilite Raporu",
  "GİZLİLİK SÖZLEŞMESİ",
  "Sözleşmeler",
  "Özlük Dosyası",
  "Kimlik Belgesi / Pasaport",
  "İhale Kararı ve Onay Belgesi",
];

type Props = {
  initialFolders: FolderListItem[];
  locations: LocationListItem[];
};

export function DossierOperationsView({ initialFolders, locations }: Props) {
  const router = useRouter();

  // Seri seçimi & ağaç görünürlüğü
  const [showSeriesTree, setShowSeriesTree] = useState(true);
  const [seriesSearch, setSeriesSearch] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    "ihale-operasyon": true,
    hukuk: true,
    "genel-yonetim": true,
  });
  const [selectedSeries, setSelectedSeries] = useState<SeriesNode>({
    id: "arsiv-projeleri",
    name: "Arşiv Projeleri",
    count: 54,
  });

  // Arama & Filtreler (Screenshot 2 Paritesi)
  const [quickSearch, setQuickSearch] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [chkCustomer1, setChkCustomer1] = useState(false);
  const [customer1Text, setCustomer1Text] = useState("");
  const [chkFullName, setChkFullName] = useState(false);
  const [fullNameText, setFullNameText] = useState("");
  const [chkCustomer2, setChkCustomer2] = useState(false);
  const [customer2Text, setCustomer2Text] = useState("");

  // Seçili Dosyalar (Checkbox)
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);

  // Modallar
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [isFolderDocsOpen, setIsFolderDocsOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [activeFolderForDocs, setActiveFolderForDocs] = useState<FolderListItem | null>(null);
  // Eklenen 3 Yeni Modal Durumları (Screenshots 1, 3, 4)
  const [isScanToFolderOpen, setIsScanToFolderOpen] = useState(false);
  const [isRelatedFoldersOpen, setIsRelatedFoldersOpen] = useState(false);
  const [isEditFolderOpen, setIsEditFolderOpen] = useState(false);
  const [activeFolderForEdit, setActiveFolderForEdit] = useState<FolderListItem | null>(null);

  // Düzenle Formu State (Screenshot 4)
  const [editYear, setEditYear] = useState("2024");
  const [editBarcode, setEditBarcode] = useState("50.1-2024-8");
  const [editRoom, setEditRoom] = useState("Malatya Merkez Kurum Arşivi (Kat -1)");
  const [editCabinNo, setEditCabinNo] = useState("Raf No");
  const [editShelfNo, setEditShelfNo] = useState("Kutu No");
  const [editBoxNo, setEditBoxNo] = useState("Kutu No");
  const [editLabel, setEditLabel] = useState("");
  const [editPersonName, setEditPersonName] = useState("AYŞEN KÜYÜK");
  const [editRecordYear, setEditRecordYear] = useState("2024");
  const [editServiceTopic, setEditServiceTopic] = useState("Kurumsal Arşiv");
  const [editCustomer, setEditCustomer] = useState("ÇANKAYA ÜNİVERSİTESİ");

  // İlişkili Dosyalar State (Screenshot 3)
  const [selectedBirimTree, setSelectedBirimTree] = useState("DİJİTAL ARŞİV BELGE BİLGİ TEKNOLOJİLERİ A.Ş.");
  const [selectedSerisi, setSelectedSerisi] = useState("Bakım / Onarım Sözleşmeleri");
  const [selectedRelatedDossier, setSelectedRelatedDossier] = useState("");


  // Yeni Dosya Form State (Screenshot 3 Paritesi)
  const [newYear, setNewYear] = useState("2024");
  const [newFolderBarcode, setNewFolderBarcode] = useState("50.1-2024-9");
  const [newRoom, setNewRoom] = useState("Malatya Merkez Kurum Arşivi (Kat -1)");
  const [newCabinNo, setNewCabinNo] = useState("");
  const [newShelfNo, setNewShelfNo] = useState("");
  const [newBoxNo, setNewBoxNo] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newPersonName, setNewPersonName] = useState("");
  const [newRecordYear, setNewRecordYear] = useState("2024");
  const [newServiceTopic, setNewServiceTopic] = useState("Kurumsal Arşiv");
  const [newCustomer, setNewCustomer] = useState("");
  const [newLocationId, setNewLocationId] = useState(locations[0]?.id ?? "");

  // Dosya Analizi Modal State (Screenshot 4 & 5 Paritesi)
  const [analysisSearch, setAnalysisSearch] = useState("");
  const [selectedDocTypes, setSelectedDocTypes] = useState<string[]>(["BİRİM FİYAT TEKLİFİ"]);
  const [analysisMode, setAnalysisMode] = useState<"icerenler" | "icermeyenler">("icerenler");

  // Sayfalama & Sayfa Başına Kayıt (Screenshot 2: 20 / 50 / 100 / 500)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Seri Ağacı Toggle
  function toggleNode(nodeId: string) {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  }

  // Seri Ağacı Filtresi
  const filteredSeriesTree = useMemo(() => {
    if (!seriesSearch.trim()) return DEFAULT_SERIES_TREE;
    const q = seriesSearch.toLowerCase();
    return DEFAULT_SERIES_TREE.map((node) => {
      const matchSelf = node.name.toLowerCase().includes(q);
      const matchingChildren = node.children?.filter((c) =>
        c.name.toLowerCase().includes(q)
      );
      if (matchSelf || (matchingChildren && matchingChildren.length > 0)) {
        return { ...node, children: matchingChildren ?? node.children };
      }
      return null;
    }).filter(Boolean) as SeriesNode[];
  }, [seriesSearch]);

  // Tablo Verisini Filtreleme
  const filteredFolders = useMemo(() => {
    return initialFolders.filter((f) => {
      if (quickSearch) {
        const q = quickSearch.toLowerCase();
        const matches =
          f.barcode.toLowerCase().includes(q) ||
          f.title.toLowerCase().includes(q) ||
          f.filePlanCode.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (chkCustomer1 && customer1Text && !f.title.toLowerCase().includes(customer1Text.toLowerCase()))
        return false;
      if (chkFullName && fullNameText && !f.locationName.toLowerCase().includes(fullNameText.toLowerCase()))
        return false;
      if (chkCustomer2 && customer2Text && !f.title.toLowerCase().includes(customer2Text.toLowerCase()))
        return false;
      return true;
    });
  }, [initialFolders, quickSearch, chkCustomer1, customer1Text, chkFullName, fullNameText, chkCustomer2, customer2Text]);

  const totalCount = filteredFolders.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const paginatedFolders = filteredFolders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Checkbox seçimleri
  function toggleSelectAll() {
    if (selectedFolderIds.length === paginatedFolders.length) {
      setSelectedFolderIds([]);
    } else {
      setSelectedFolderIds(paginatedFolders.map((f) => f.id));
    }
  }

  function toggleSelectRow(id: string) {
    setSelectedFolderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  // Yeni Dosya Ekleme (Screenshot 3)
  function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderBarcode.trim()) {
      toast.error("Lütfen dosya barkodunu girin.");
      return;
    }

    toast.success(
      <div className="flex flex-col gap-0.5">
        <span className="font-bold">Yeni Arşiv Dosyası Kaydedildi</span>
        <span className="text-xs">
          Barkod: {newFolderBarcode} · Yıl: {newYear} · Konum: {newRoom} / {newCabinNo || "Kabin-1"}
        </span>
      </div>
    );
    setIsNewFolderOpen(false);
  }

  function handleClearCreateForm() {
    setNewYear("2024");
    setNewFolderBarcode("50.1-2024-9");
    setNewCabinNo("");
    setNewShelfNo("");
    setNewBoxNo("");
    setNewLabel("");
    setNewPersonName("");
    setNewCustomer("");
    toast.info("Yeni dosya formu temizlendi.");
  }

  // Dosyaya Ait Evrakları Açma (Screenshot 4)
  function openFolderDocuments(folder: FolderListItem) {
    setActiveFolderForDocs(folder);
    setIsFolderDocsOpen(true);
  }

  return (
    <div className="flex flex-col gap-3 font-sans h-full">
      {/* ========================================================================= */}
      {/* 1. ÜST NAVİGASYON VE MOD SEÇİM ŞERİDİ (Screenshot 1 & 2 Header)          */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          {/* Geri ve Ana Sayfa Butonları */}
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Geri</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-700 transition-colors shadow-2xs"
          >
            <Home className="size-3.5" />
            <span>Ana Sayfa</span>
          </Link>

          {/* Serileri Gizle/Göster & İndekslenen Dosyalar Sekmeleri */}
          <button
            type="button"
            onClick={() => setShowSeriesTree(!showSeriesTree)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition-colors ${
              showSeriesTree
                ? "bg-slate-800 text-white dark:bg-slate-700"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="size-3.5" />
            <span>Serileri {showSeriesTree ? "Gizle" : "Göster"}</span>
          </button>

          <span className="rounded-md border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 px-3 py-1 text-xs font-bold text-sky-700 dark:text-sky-300">
            İndekslenen Dosyalar
          </span>
        </div>

        {/* Bilgilendirme Rozeti */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-medium border-border">
            Toplam: <strong className="ml-1 text-foreground">{totalCount}</strong> Dosya
          </Badge>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ANA ÇALIŞMA ALANI: SOL SERİLER AĞACI + SAĞ DOSYALAR TABLOSU            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[600px] flex-1">
        {/* SOL SERİLER AĞACI */}
        {showSeriesTree && (
          <aside className="lg:col-span-3 rounded-xl border border-border bg-card p-3 shadow-xs flex flex-col gap-2 max-h-[780px] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Folder className="size-4 text-amber-500" />
                Seriler
              </span>
              <button
                type="button"
                onClick={() => {
                  const allExpanded = Object.keys(expandedNodes).length > 0;
                  setExpandedNodes(allExpanded ? {} : { "ihale-operasyon": true, hukuk: true });
                }}
                className="rounded px-2 py-0.5 text-[10px] font-bold border border-border bg-muted hover:bg-muted/80 text-foreground"
              >
                Kapat/Aç
              </button>
            </div>

            {/* Ağaç İçi Arama */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={seriesSearch}
                onChange={(e) => setSeriesSearch(e.target.value)}
                placeholder="Seri Ara..."
                className="h-7 pl-7 text-[11px]"
              />
            </div>

            {/* Seri Listesi */}
            <div className="flex-1 overflow-y-auto pr-1 text-xs flex flex-col gap-0.5">
              {filteredSeriesTree.map((node) => {
                const hasChildren = Boolean(node.children && node.children.length > 0);
                const isExpanded = expandedNodes[node.id];
                const isSelected = selectedSeries.id === node.id;

                return (
                  <div key={node.id} className="flex flex-col">
                    <div
                      onClick={() => {
                        if (hasChildren) toggleNode(node.id);
                        setSelectedSeries(node);
                      }}
                      className={`flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-bold border border-sky-300 dark:border-sky-800"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {hasChildren ? (
                          <span className="text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                          </span>
                        ) : (
                          <span className="size-3.5" />
                        )}
                        <span className="truncate text-[11px]">{node.name}</span>
                      </div>
                      {node.count !== undefined && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {node.count}
                        </span>
                      )}
                    </div>

                    {/* Alt Birimler / Seriler */}
                    {hasChildren && isExpanded && (
                      <div className="flex flex-col pl-4 border-l border-border/60 ml-2 mt-0.5 gap-0.5">
                        {node.children?.map((child) => {
                          const isChildSelected = selectedSeries.id === child.id;
                          return (
                            <div
                              key={child.id}
                              onClick={() => setSelectedSeries(child)}
                              className={`flex items-center justify-between px-2 py-1 rounded-md cursor-pointer transition-colors ${
                                isChildSelected
                                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-400/40"
                                  : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span className="truncate text-[11px]">{child.name}</span>
                              {child.count !== undefined && (
                                <span className="text-[10px] font-mono opacity-80">
                                  {child.count}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* SAĞ DOSYALAR ÇALIŞMA ALANI & TABLOSU (Screenshot 2) */}
        <main
          className={`${
            showSeriesTree ? "lg:col-span-9" : "lg:col-span-12"
          } rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3`}
        >
          {/* Hızlı Arama & Gelişmiş MBB Arşiv Kriter Kutuları (Screenshot 2 Paritesi) */}
          <div className="flex flex-col gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  Hızlı Arama:
                </span>
                <Input
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Arama için değer giriniz!"
                  className="h-8.5 pl-24 text-xs"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                className="gap-1.5 text-xs h-8.5"
              >
                <Search className="size-3.5" />
                <span>Detaylı Arama {showAdvancedSearch ? "Gizle" : "Göster"}</span>
              </Button>
            </div>

            {/* MBB Arşiv Screenshot 2 Kriter Şeridi: MÜŞTERİ / TEDARİKÇİ, ADI SOYADI vb. */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={chkCustomer1}
                  onChange={(e) => setChkCustomer1(e.target.checked)}
                  className="size-3.5 rounded border-border"
                  id="chk1"
                />
                <label htmlFor="chk1" className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                  MÜŞTERİ | TEDARİKÇİ
                </label>
                <Input
                  value={customer1Text}
                  onChange={(e) => setCustomer1Text(e.target.value)}
                  placeholder="Müşteri/Kurum..."
                  className="h-7 text-xs flex-1"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={chkFullName}
                  onChange={(e) => setChkFullName(e.target.checked)}
                  className="size-3.5 rounded border-border"
                  id="chk2"
                />
                <label htmlFor="chk2" className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                  ADI SOYADI
                </label>
                <Input
                  value={fullNameText}
                  onChange={(e) => setFullNameText(e.target.value)}
                  placeholder="Yetkili personel..."
                  className="h-7 text-xs flex-1"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={chkCustomer2}
                  onChange={(e) => setChkCustomer2(e.target.checked)}
                  className="size-3.5 rounded border-border"
                  id="chk3"
                />
                <label htmlFor="chk3" className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                  MÜŞTERİ - TEDARİKÇİ
                </label>
                <Input
                  value={customer2Text}
                  onChange={(e) => setCustomer2Text(e.target.value)}
                  placeholder="Tedarikçi firma..."
                  className="h-7 text-xs flex-1"
                />
              </div>

              <Button
                size="sm"
                onClick={() => toast.success("Filtreleme kriterleri uygulandı.")}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-7 text-xs gap-1"
              >
                <Search className="size-3" />
                <span>Arama Yap</span>
              </Button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* İŞLEM BUTONLARI ŞERİDİ (Screenshot 2 Action Ribbon)                       */}
          {/* ========================================================================= */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs py-1">
            {/* Yeni Dosya Ekle Butonu */}
            <Button
              size="sm"
              onClick={() => setIsNewFolderOpen(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1 text-xs h-8"
            >
              <FolderPlus className="size-3.5" />
              <span>Yeni Dosya</span>
            </Button>

            {/* Dosya Analizi (Screenshot 4 & 5 Modalı Açıcı) */}
            {/* İlişkili Dosyalar (Screenshot 3 Modalı Açıcı) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRelatedFoldersOpen(true)}
              className="gap-1 text-xs h-8 font-semibold text-sky-600 border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30"
            >
              <FolderTree className="size-3.5" />
              <span>İlişkili Dosyalar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAnalysisModalOpen(true)}
              className="gap-1 text-xs h-8 font-semibold text-primary border-primary/40 bg-primary/5"
            >
              <Search className="size-3.5" />
              <span>Dosya Analizi</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Mükerrer dosya kontrolü yapıldı: Mükerrer kayıt yok.")}
              className="gap-1 text-xs h-8"
            >
              <Search className="size-3.5 text-amber-500" />
              <span>Mükerrer Arama</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("İçe aktarım Excel şablonu indirildi.")}
              className="gap-1 text-xs h-8"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Şablonu İndir</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Excel yükleme penceresi açıldı.")}
              className="gap-1 text-xs h-8"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Excelden İçeri Aktar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Dosya listesi Excel olarak dışa aktarıldı.")}
              className="gap-1 text-xs h-8"
            >
              <Download className="size-3.5 text-blue-600" />
              <span>Listeyi Dışa Aktar</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedFolderIds.length === 0) {
                  toast.error("Lütfen etiket basılacak klasörleri tablodan seçin.");
                } else {
                  toast.success(`${selectedFolderIds.length} adet klasör için barkod etiketi yazdırılıyor.`);
                }
              }}
              className="gap-1 text-xs h-8"
            >
              <Tag className="size-3.5 text-purple-600" />
              <span>Etiket Bas</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Toplu işlem sihirbazı hazır.")}
              className="gap-1 text-xs h-8"
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Toplu İşlem</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsScanToFolderOpen(true)}
              className="gap-1 text-xs h-8 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
            >
              <UploadCloud className="size-3.5" />
              <span>Dosyaya Materyal Yükle</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (paginatedFolders.length > 0) {
                  openFolderDocuments(paginatedFolders[0]);
                } else {
                  toast.error("Görüntülenecek klasör yok.");
                }
              }}
              className="gap-1 text-xs h-8 font-semibold text-primary"
            >
              <FolderOpen className="size-3.5" />
              <span>Seçili Dosyanın Belgeleri</span>
            </Button>
          </div>

          {/* ========================================================================= */}
          {/* DOSYALAR VERİ TABLOSU (Screenshot 2 Tam Kolon Paritesi)                   */}
          {/* ========================================================================= */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/70 text-foreground font-bold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedFolders.length > 0 &&
                        selectedFolderIds.length === paginatedFolders.length
                      }
                      onChange={toggleSelectAll}
                      className="size-3.5 rounded border-border"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-20 text-center">EVRAK SAYISI</th>
                  <th className="py-2.5 px-3 w-32">BARKOD</th>
                  <th className="py-2.5 px-3 w-20 text-center">DOSYA YILI</th>
                  <th className="py-2.5 px-3">MÜŞTERİ - TEDARİKÇİ</th>
                  <th className="py-2.5 px-3">ÜRÜN - HİZMET KONUSU</th>
                  <th className="py-2.5 px-3 w-36">ADI SOYADI</th>
                  <th className="py-2.5 px-3 w-16 text-center">YIL</th>
                  <th className="py-2.5 px-3 w-40 text-center">İŞLEMLER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedFolders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Folder className="size-8 opacity-30" />
                        <span className="font-semibold text-sm">Kayıtlı Arşiv Dosyası Bulunamadı</span>
                        <p className="text-xs">
                          Yukarıdaki <strong>Yeni Dosya</strong> butonuna basarak bu seriye ilk klasörü ekleyebilirsiniz.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedFolders.map((folder, idx) => {
                    const isSelected = selectedFolderIds.includes(folder.id);
                    return (
                      <tr
                        key={folder.id}
                        className={`hover:bg-muted/50 transition-colors ${
                          isSelected ? "bg-sky-500/5" : ""
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(folder.id)}
                            className="size-3.5 rounded border-border"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            onClick={() => openFolderDocuments(folder)}
                            className="cursor-pointer font-bold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center justify-center size-6 rounded-full bg-sky-100 dark:bg-sky-950/60"
                          >
                            {folder.documentCount || 1}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <FileText className="size-3.5 text-rose-500 shrink-0" />
                            <span>{folder.barcode}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                          2024
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground truncate max-w-[180px]">
                          {folder.title}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[160px]">
                          {selectedSeries.name || "Kurumsal Arşiv"}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground truncate">
                          Ali METE
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                          2024
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Dosyaya ait evraklar modalı */}
                            <button
                              type="button"
                              onClick={() => openFolderDocuments(folder)}
                              className="size-7 flex items-center justify-center rounded hover:bg-sky-100 dark:hover:bg-sky-950 text-sky-600 transition-colors"
                              title="Dosyaya Ait Evraklar"
                            >
                              <FolderOpen className="size-3.5" />
                            </button>

                            {/* Düzenle Modalı (Screenshot 4) */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveFolderForEdit(folder);
                                setEditBarcode(folder.barcode);
                                setEditCustomer(folder.title);
                                setIsEditFolderOpen(true);
                              }}
                              className="size-7 flex items-center justify-center rounded hover:bg-muted text-foreground transition-colors"
                              title="Düzenle"
                            >
                              <Edit3 className="size-3.5" />
                            </button>

                            {/* Barkod Bas */}
                            <button
                              type="button"
                              onClick={() => toast.success(`Barkod ${folder.barcode} yazdırılıyor.`)}
                              className="size-7 flex items-center justify-center rounded hover:bg-muted text-purple-600 transition-colors"
                              title="Barkod Bas"
                            >
                              <Tag className="size-3.5" />
                            </button>

                            {/* Doğrudan Belge Görüntüleyiciye Git */}
                            <Link
                              href="/documents/doc-sozlesme-1"
                              className="size-7 flex items-center justify-center rounded hover:bg-muted text-sky-500 transition-colors"
                              title="Belge Görüntüleyici"
                            >
                              <Eye className="size-3.5" />
                            </Link>

                            {/* Sil */}
                            <button
                              type="button"
                              onClick={() => toast.error("Arşiv mevzuatı gereğince imha kararı olmadan doğrudan dosya silinemez.")}
                              className="size-7 flex items-center justify-center rounded hover:bg-red-100 dark:hover:bg-red-950 text-red-600 transition-colors"
                              title="Sil"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Alt Sayfalama Şeridi (Screenshot 2: Sayfa Başına [20 / 50 / 100 / 500] kayıt) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>
                {totalCount} kayıttan {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, totalCount)} arası gösteriliyor.
              </span>
              <div className="flex items-center gap-1">
                <span>Sayfa başına:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-6.5 rounded border border-border bg-background px-1.5 text-xs text-foreground"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                </select>
                <span>kayıt.</span>
              </div>
            </div>

            <div className="flex items-center gap-1 font-mono">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="h-7 px-2 text-xs"
              >
                ‹
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`size-7 rounded text-xs font-bold transition-colors ${
                    currentPage === p
                      ? "bg-sky-600 text-white"
                      : "border border-border hover:bg-muted text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-7 px-2 text-xs"
              >
                ›
              </Button>
            </div>
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL: YENİ DOSYA EKLE (Screenshot 3 Birebir Paritesi)                 */}
      {/* ========================================================================= */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Yeni Dosya Ekle</h3>
              <button
                type="button"
                onClick={() => setIsNewFolderOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="flex flex-col gap-3 text-xs">
              {/* Dosya Yılı */}
              <div className="flex flex-col gap-1">
                <Label htmlFor="dosya-yili" className="font-semibold text-foreground">
                  Dosya Yılı *
                </Label>
                <Input
                  id="dosya-yili"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  placeholder="2024"
                  required
                />
              </div>

              {/* Dosya Barkodu & Son Eklenen Barkod İpucu */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dosya-barkodu" className="font-semibold text-foreground">
                    Dosya Barkodu *
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    * Son eklenen barkod: <strong>50.1-2024-8</strong>
                  </span>
                </div>
                <Input
                  id="dosya-barkodu"
                  value={newFolderBarcode}
                  onChange={(e) => setNewFolderBarcode(e.target.value)}
                  placeholder="50.1-2024-9"
                  required
                />
              </div>

              {/* Arşiv Odası */}
              <div className="flex flex-col gap-1">
                <Label htmlFor="arsiv-odasi" className="font-semibold text-foreground">
                  Arşiv Odası *
                </Label>
                <select
                  id="arsiv-odasi"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  className="h-8.5 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="Malatya Merkez Kurum Arşivi (Kat -1)">Malatya Merkez Kurum Arşivi (Kat -1)</option>
                  <option value="1. Bodrum Raylı Dolap Odası">1. Bodrum Raylı Dolap Odası</option>
                  <option value="Zemin Kat Hukuk Arşiv Deposu">Zemin Kat Hukuk Arşiv Deposu</option>
                  <option value="2. Kat Dijitalleştirme ve Tasnif Odası">2. Kat Dijitalleştirme ve Tasnif Odası</option>
                </select>
              </div>

              {/* Kabin No, Raf No, Kutu No Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="font-semibold text-foreground">Kabin No: *</Label>
                  <Input
                    value={newCabinNo}
                    onChange={(e) => setNewCabinNo(e.target.value)}
                    placeholder="Raf No"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="font-semibold text-foreground">Raf No: *</Label>
                  <Input
                    value={newShelfNo}
                    onChange={(e) => setNewShelfNo(e.target.value)}
                    placeholder="Kutu No"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="font-semibold text-foreground">Kutu No: *</Label>
                  <Input
                    value={newBoxNo}
                    onChange={(e) => setNewBoxNo(e.target.value)}
                    placeholder="Kutu No"
                    required
                  />
                </div>
              </div>

              {/* Etiket */}
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Etiket: *</Label>
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Etiket"
                  required
                />
              </div>

              {/* ADI SOYADI */}
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">ADI SOYADI:</Label>
                <Input
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Adı Soyadı giriniz..."
                />
              </div>

              {/* YILI */}
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">YILI:</Label>
                <Input
                  value={newRecordYear}
                  onChange={(e) => setNewRecordYear(e.target.value)}
                  placeholder="2024"
                />
              </div>

              {/* ÜRÜN - HİZMET KONUSU */}
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">ÜRÜN - HİZMET KONUSU:</Label>
                <Input
                  value={newServiceTopic}
                  onChange={(e) => setNewServiceTopic(e.target.value)}
                  placeholder="Kurumsal Arşiv"
                />
              </div>

              {/* MÜŞTERİ - TEDARİKÇİ */}
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">MÜŞTERİ - TEDARİKÇİ:</Label>
                <Input
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  placeholder="Kurum veya firma adı..."
                />
              </div>

              {/* Alt Butonlar (Screenshot 3 Paritesi: [ Kaydet ] & [ Temizle ]) */}
              <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
                <Button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-6 h-9 rounded-md"
                >
                  Kaydet
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearCreateForm}
                  className="bg-sky-400 hover:bg-sky-500 text-white font-bold rounded-md px-5 h-9 border-none"
                >
                  Temizle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: DOSYA ANALİZİ (Screenshots 4 & 5 Birebir Paritesi)              */}
      {/* ========================================================================= */}
      {isAnalysisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Dosya Analizi</h3>
              <button
                type="button"
                onClick={() => setIsAnalysisModalOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5 text-xs">
              {/* Evrak Tipi Arama & Seçim */}
              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold text-foreground">Evrak Tipi</Label>

                {/* Seçili Tag Rozetleri (Screenshot 5: [ BİRİM FİYAT TEKLİFİ x ]) */}
                <div className="flex flex-wrap items-center gap-1 min-h-8 p-1.5 rounded-lg border border-border bg-background">
                  {selectedDocTypes.map((type) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1 rounded bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-foreground"
                    >
                      <span>{type}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedDocTypes((prev) => prev.filter((t) => t !== type))
                        }
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Arama Kutusu ve Checkbox Listesi (Screenshot 4) */}
                <div className="rounded-lg border border-border bg-background p-2 flex flex-col gap-1 max-h-48 overflow-y-auto">
                  <div className="relative mb-1">
                    <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={analysisSearch}
                      onChange={(e) => setAnalysisSearch(e.target.value)}
                      placeholder="Evrak tipi ara..."
                      className="h-7 pl-7 text-[11px]"
                    />
                  </div>

                  <label className="flex items-center gap-2 p-1 rounded hover:bg-muted cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={selectedDocTypes.length === EVRAK_TIPLERI_LIST.length}
                      onChange={(e) => {
                        setSelectedDocTypes(e.target.checked ? [...EVRAK_TIPLERI_LIST] : []);
                      }}
                      className="size-3.5 rounded border-border"
                    />
                    <span>Tümü</span>
                  </label>

                  {EVRAK_TIPLERI_LIST.filter((t) =>
                    t.toLowerCase().includes(analysisSearch.toLowerCase())
                  ).map((type) => {
                    const isChecked = selectedDocTypes.includes(type);
                    return (
                      <label
                        key={type}
                        className="flex items-center gap-2 p-1 rounded hover:bg-muted cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedDocTypes((prev) =>
                              isChecked
                                ? prev.filter((t) => t !== type)
                                : [...prev, type]
                            );
                          }}
                          className="size-3.5 rounded border-border"
                        />
                        <span>{type}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Tür Seçimi (Screenshot 5: İçerenler / İçermeyenler) */}
              <div className="flex flex-col gap-1.5">
                <Label className="font-semibold text-foreground">Tür</Label>
                <select
                  value={analysisMode}
                  onChange={(e) => setAnalysisMode(e.target.value as any)}
                  className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="icerenler">İçerenler</option>
                  <option value="icermeyenler">İçermeyenler</option>
                </select>
                <span className="text-[10px] text-muted-foreground">
                  * Seçilen evrak tiplerine sahip olan veya bu evrakların eksik olduğu klasörleri analiz eder.
                </span>
              </div>

              {/* Analiz Butonu */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAnalysisModalOpen(false)}
                >
                  Kapat
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    toast.success(
                      `Analiz tamamlandı: Seçili kriterlere göre ${paginatedFolders.length} klasör listelendi.`
                    );
                    setIsAnalysisModalOpen(false);
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
                >
                  Analizi Başlat
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: DOSYAYA AİT EVRAKLAR                                            */}
      {/* ========================================================================= */}
      {isFolderDocsOpen && activeFolderForDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-foreground">Dosyaya ait Evraklar</h3>
                <span className="text-xs text-muted-foreground font-mono">
                  Barkod: {activeFolderForDocs.barcode} · {activeFolderForDocs.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFolderDocsOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info("Evrak listesi yazdırılıyor.")}
                  className="bg-sky-600 text-white hover:bg-sky-700 h-8 gap-1"
                >
                  <Printer className="size-3.5" />
                  <span>Yazdır</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.success("Evrak listesi Excel formatında indirildi.")}
                  className="bg-sky-700 text-white hover:bg-sky-800 h-8 gap-1"
                >
                  <FileSpreadsheet className="size-3.5" />
                  <span>Excele Aktar</span>
                </Button>
              </div>

              {/* Seçilenleri İndir & Sil */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    onClick={() => toast.success("Seçili evraklar ZIP olarak indiriliyor.")}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-8 text-xs"
                  >
                    Seçilenleri İndir
                  </Button>
                  <select className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground">
                    <option value="all">İndirilecek Evrak Türü (Tümü)</option>
                    <option value="pdf">Yalnızca PDF Dosyaları</option>
                    <option value="tiff">Yalnızca TIFF Görselleri</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => toast.error("Silme gerekçesi belirtilmeden evrak silinemez.")}
                    className="h-8 text-xs font-bold"
                  >
                    Seçilenleri Sil
                  </Button>
                  <Input
                    placeholder="Silme Sebebi *"
                    className="h-8 text-xs w-36"
                  />
                </div>
              </div>
            </div>

            {/* Evrak Tablosu */}
            <div className="flex-1 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70 text-foreground font-bold border-b border-border sticky top-0">
                  <tr>
                    <th className="py-2 px-3 w-8 text-center">
                      <input type="checkbox" className="size-3 rounded border-border" />
                    </th>
                    <th className="py-2 px-3 w-10 text-center">No</th>
                    <th className="py-2 px-3">Evrak Türü</th>
                    <th className="py-2 px-3">Yükleyen Kullanıcı</th>
                    <th className="py-2 px-3">Yükleme Tarihi</th>
                    <th className="py-2 px-3">Dosya Türü</th>
                    <th className="py-2 px-3">Evrak Adı</th>
                    <th className="py-2 px-3 w-20 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    {
                      no: 1,
                      type: "BİRİM FİYAT TEKLİFİ",
                      user: "073352 (Ali METE)",
                      date: "12.02.2024 16:27:17",
                      fileType: "application/pdf",
                      name: "50.1-2024-8_BirimFiyatTeklifi.pdf",
                      docId: "doc-teklif-1",
                    },
                    {
                      no: 2,
                      type: "GİZLİLİK SÖZLEŞMESİ",
                      user: "073352 (Ali METE)",
                      date: "12.02.2024 16:28:11",
                      fileType: "application/pdf",
                      name: "50.1-2024-8_GizlilikSozlesmesi.pdf",
                      docId: "doc-sozlesme-2",
                    },
                    {
                      no: 3,
                      type: "Fatura",
                      user: "073352 (Ali METE)",
                      date: "12.02.2024 16:30:05",
                      fileType: "image/tiff",
                      name: "50.1-2024-8_Fatura_2024.tif",
                      docId: "doc-fatura-3",
                    },
                    {
                      no: 4,
                      type: "Dilekçe - Talep Yazısı",
                      user: "073352 (Ali METE)",
                      date: "12.02.2024 16:31:40",
                      fileType: "application/pdf",
                      name: "50.1-2024-8_Dilekce.pdf",
                      docId: "doc-dilekce-4",
                    },
                  ].map((doc) => (
                    <tr key={doc.no} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2 px-3 text-center">
                        <input type="checkbox" className="size-3 rounded border-border" />
                      </td>
                      <td className="py-2 px-3 text-center font-mono">{doc.no}</td>
                      <td className="py-2 px-3 font-semibold text-foreground">{doc.type}</td>
                      <td className="py-2 px-3 text-muted-foreground">{doc.user}</td>
                      <td className="py-2 px-3 font-mono text-muted-foreground">{doc.date}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {doc.fileType}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 font-mono text-foreground truncate max-w-xs">
                        {doc.name}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href="/documents/doc-sozlesme-1"
                            className="size-6 rounded flex items-center justify-center bg-sky-50 dark:bg-sky-950 text-sky-600 hover:bg-sky-100 transition-colors"
                            title="Belge Görüntüleyicide Aç"
                          >
                            <Eye className="size-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => toast.error("Silme yetkiniz bulunmamaktadır.")}
                            className="size-6 rounded flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                            title="Evrakı Sil"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
              <span>Toplam 4 Evrak listelendi.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFolderDocsOpen(false)}
              >
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 6. MODAL: DOSYAYA EVRAK TARAMA (Screenshot 1 Birebir Paritesi)            */}
      {/* ========================================================================= */}
      {isScanToFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Dosyaya Evrak Tarama</h3>
              <button
                type="button"
                onClick={() => setIsScanToFolderOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* hyperDoc sürücü uyarı bandı */}
            <div className="rounded-lg border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/40 p-2.5 text-sky-800 dark:text-sky-300 flex items-center gap-1.5 text-[11px]">
              <span>hyperDoc ile bağlantı hatası..</span>
              <a href="#" className="font-bold underline hover:text-sky-900 dark:hover:text-sky-100">
                buraya tıklayarak tarayıcı yazılımını indirebilirsiniz.
              </a>
            </div>

            {/* Tarayıcı Seçimi ve Donanım Ayarları */}
            <div className="rounded-xl border border-border bg-muted/30 p-3 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Tarayıcılar:</span>
                <select className="h-8 rounded border border-border bg-background px-2 text-xs flex-1 max-w-xs">
                  <option value="fujitsu">Fujitsu fi-7160 (TWAIN - 60 ppm Duplex)</option>
                  <option value="kodak">Kodak i3400 Production Scanner</option>
                  <option value="canon">Canon DR-M260</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
                {/* Donanım Checkbox'ları */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" className="size-3.5 rounded border-border" />
                    <span>Seri Tarama</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" className="size-3.5 rounded border-border" />
                    <span>Arayüzü Göster</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" className="size-3.5 rounded border-border" />
                    <span>Tarayıcı Ayarlarını Kullan</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" defaultChecked className="size-3.5 rounded border-border" />
                    <span className="font-semibold">Siyah Beyaz Tarama</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" defaultChecked className="size-3.5 rounded border-border" />
                    <span className="font-semibold">Çiftli Yönlü Tarama</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" defaultChecked className="size-3.5 rounded border-border" />
                    <span className="font-semibold">Boş Sayfa Temizleme</span>
                  </label>
                </div>

                {/* Tarama Modu Radio */}
                <div className="rounded-lg border border-border bg-background p-2.5 flex flex-col gap-2">
                  <span className="font-bold text-foreground text-[11px]">Tarama Modu</span>
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input type="radio" name="tarama-modu" defaultChecked className="size-3.5" />
                    <span>Çoklu Tarama</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input type="radio" name="tarama-modu" className="size-3.5" />
                    <span>Tekli Tarama</span>
                  </label>
                </div>

                {/* İndeks Modu Radio */}
                <div className="rounded-lg border border-border bg-background p-2.5 flex flex-col gap-2">
                  <span className="font-bold text-foreground text-[11px]">İndeks Modu</span>
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input type="radio" name="indeks-modu" className="size-3.5" />
                    <span>Çoklu İndex</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input type="radio" name="indeks-modu" defaultChecked className="size-3.5" />
                    <span>Tekli İndex</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-medium">
                    <input type="radio" name="indeks-modu" className="size-3.5" />
                    <span>Dosya İndex</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 5 Eylem Butonu (Screenshot 1) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsScanToFolderOpen(false);
                  setIsNewFolderOpen(true);
                }}
                className="rounded-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold px-4 py-1.5 text-xs shadow-xs"
              >
                Yeni Dosya Ekle
              </button>
              <button
                type="button"
                onClick={() => toast.success("Tarayıcıdan belge çekiliyor...")}
                className="rounded-full bg-[#38bdf8] hover:bg-[#0ea5e9] text-slate-950 font-bold px-4 py-1.5 text-xs shadow-xs"
              >
                Tara
              </button>
              <button
                type="button"
                onClick={() => toast.success("Evrak dosyaya kaydedildi ve indekslendi.")}
                className="rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold px-4 py-1.5 text-xs shadow-xs"
              >
                Kaydet ve İndeksle
              </button>
              <button
                type="button"
                onClick={() => toast.info("Dosya seçici açıldı.")}
                className="rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold px-4 py-1.5 text-xs shadow-xs"
              >
                Evrak Yükle ve İndeksle
              </button>
              <button
                type="button"
                onClick={() => toast.info("Sadece indekse gönderildi.")}
                className="rounded-full bg-[#f59e0b] hover:bg-[#d97706] text-white font-bold px-4 py-1.5 text-xs shadow-xs"
              >
                Sadece İndekse Gönder
              </button>
            </div>

            {/* Dosya Seç */}
            <div className="flex items-center gap-2 py-1">
              <span className="rounded border border-border bg-muted px-2 py-1 font-bold">Dosya Seç</span>
              <span className="text-muted-foreground">Dosya seçilmedi</span>
            </div>

            {/* Önizleme Kanvası */}
            <div className="min-h-[220px] rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
              <Printer className="size-10 text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-foreground">Taranan Sayfalar Burada Görünecektir</p>
              <p className="text-[11px] mt-0.5">Tarayıcıdan doğrudan tarama yapabilir veya bilgisayarınızdan dosya seçebilirsiniz.</p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: İLİŞKİLİ DOSYALAR (Screenshot 3 Birebir Paritesi)                 */}
      {/* ========================================================================= */}
      {isRelatedFoldersOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">İlişkili Dosyalar</h3>
              <button
                type="button"
                onClick={() => setIsRelatedFoldersOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Birimi Hiyerarşik Ağaç Dropdown */}
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Birimi</Label>
                <select
                  value={selectedBirimTree}
                  onChange={(e) => setSelectedBirimTree(e.target.value)}
                  className="h-8.5 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="DİJİTAL ARŞİV BELGE BİLGİ TEKNOLOJİLERİ A.Ş.">
                    📁 DİJİTAL ARŞİV BELGE BİLGİ TEKNOLOJİLERİ A.Ş.
                  </option>
                  <option value="BİLGİ TEKNOLOJİLERİ DİREKTÖRLÜĞÜ">
                    ├─ BİLGİ TEKNOLOJİLERİ DİREKTÖRLÜĞÜ
                  </option>
                  <option value="GENEL YÖNETİM İŞLERİ">
                    ├─ GENEL YÖNETİM İŞLERİ
                  </option>
                  <option value="HUKUK İŞLERİ DİREKTÖRLÜĞÜ">
                    ├─ HUKUK İŞLERİ DİREKTÖRLÜĞÜ
                  </option>
                  <option value="İHALE VE PROJELER DİREKTÖRLÜĞÜ">
                    ├─ İHALE VE PROJELER DİREKTÖRLÜĞÜ
                  </option>
                  <option value="İNSAN KAYNAKLARI DİREKTÖRLÜĞÜ">
                    ├─ İNSAN KAYNAKLARI DİREKTÖRLÜĞÜ
                  </option>
                  <option value="KURUMSAL MÜŞTERİ İLİŞKİLERİ">
                    ├─ KURUMSAL MÜŞTERİ İLİŞKİLERİ
                  </option>
                  <option value="MALİ İŞLER DİREKTÖRLÜĞÜ">
                    └─ MALİ İŞLER DİREKTÖRLÜĞÜ (Muhasebe / Yönetim Kurulu)
                  </option>
                </select>
              </div>

              {/* Serisi */}
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Serisi</Label>
                <select
                  value={selectedSerisi}
                  onChange={(e) => setSelectedSerisi(e.target.value)}
                  className="h-8.5 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="Bakım / Onarım Sözleşmeleri">Bakım / Onarım Sözleşmeleri</option>
                  <option value="Arşiv Projeleri">Arşiv Projeleri</option>
                  <option value="Doğrudan Temin Dosyası">Doğrudan Temin Dosyası</option>
                  <option value="İhale Dosyası">İhale Dosyası</option>
                  <option value="Dava Dosyası">Dava Dosyası</option>
                </select>
              </div>

              {/* Dosya Bul */}
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Dosya Bul</Label>
                <select
                  value={selectedRelatedDossier}
                  onChange={(e) => setSelectedRelatedDossier(e.target.value)}
                  className="h-8.5 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">-- Dosya Seçiniz --</option>
                  {initialFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.barcode} - {f.title} ({f.locationName || f.locationCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRelatedFoldersOpen(false)}
                >
                  Kapat
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    toast.success("Seçilen ilişkili dosya bağlandı.");
                    setIsRelatedFoldersOpen(false);
                  }}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
                >
                  İlişkilendir
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: DÜZENLE (Screenshot 4 Birebir Paritesi)                          */}
      {/* ========================================================================= */}
      {isEditFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Düzenle</h3>
              <button
                type="button"
                onClick={() => setIsEditFolderOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                toast.success(`Dosya ${editBarcode} güncellendi.`);
                setIsEditFolderOpen(false);
              }}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Dosya Yılı *</Label>
                <Input
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-foreground">Dosya Barkodu *</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    * Son eklenen barkod: 50.1-2024-8
                  </span>
                </div>
                <Input
                  value={editBarcode}
                  onChange={(e) => setEditBarcode(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Arşiv Odası *</Label>
                <select
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  className="h-8.5 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="Malatya Merkez Kurum Arşivi (Kat -1)">Malatya Merkez Kurum Arşivi (Kat -1)</option>
                  <option value="1. Bodrum Raylı Dolap Odası">1. Bodrum Raylı Dolap Odası</option>
                  <option value="Zemin Kat Hukuk Arşiv Deposu">Zemin Kat Hukuk Arşiv Deposu</option>
                  <option value="2. Kat Dijitalleştirme ve Tasnif Odası">2. Kat Dijitalleştirme ve Tasnif Odası</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="font-semibold text-foreground">Kabin No: *</Label>
                  <Input
                    value={editCabinNo}
                    onChange={(e) => setEditCabinNo(e.target.value)}
                    placeholder="Raf No"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="font-semibold text-foreground">Raf No: *</Label>
                  <Input
                    value={editShelfNo}
                    onChange={(e) => setEditShelfNo(e.target.value)}
                    placeholder="Kutu No"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="font-semibold text-foreground">Kutu No: *</Label>
                  <Input
                    value={editBoxNo}
                    onChange={(e) => setEditBoxNo(e.target.value)}
                    placeholder="Kutu No"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Etiket: *</Label>
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Etiket"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">ADI SOYADI:</Label>
                <Input
                  value={editPersonName}
                  onChange={(e) => setEditPersonName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">YILI:</Label>
                <Input
                  value={editRecordYear}
                  onChange={(e) => setEditRecordYear(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">ÜRÜN - HİZMET KONUSU:</Label>
                <Input
                  value={editServiceTopic}
                  onChange={(e) => setEditServiceTopic(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">MÜŞTERİ - TEDARİKÇİ:</Label>
                <Input
                  value={editCustomer}
                  onChange={(e) => setEditCustomer(e.target.value)}
                />
              </div>

              {/* Alt Butonlar (Screenshot 4: [ Kaydet ] - [ Temizle ] [ Etiket Bas ]) */}
              <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
                <Button
                  type="submit"
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-6 h-9 rounded-md"
                >
                  Kaydet
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditPersonName("");
                      setEditCustomer("");
                      setEditLabel("");
                    }}
                    className="bg-sky-400 hover:bg-sky-500 text-white font-bold rounded-md px-4 h-9 border-none"
                  >
                    Temizle
                  </Button>

                  <Button
                    type="button"
                    onClick={() => toast.success(`Barkod ${editBarcode} yazdırılıyor.`)}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-md px-4 h-9"
                  >
                    Etiket Bas
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
