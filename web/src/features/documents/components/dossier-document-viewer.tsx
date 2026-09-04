"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  FolderArchive,
  HandCoins,
  Home,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  Printer,
  RefreshCw,
  RotateCw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  User,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type DocumentViewerProps = {
  documentId: string;
  documentTitle: string;
  folderTitle?: string;
  folderBarcode?: string;
  contentUrl?: string;
  downloadUrl?: string;
  mimeType?: string | null;
};

export function DossierDocumentViewer({
  documentId,
  documentTitle,
  folderTitle = "İstanbul Üniversitesi Edebiyat Fakültesi Arşiv Düzenleme",
  folderBarcode = "djt38",
  contentUrl,
  downloadUrl,
  mimeType = "application/pdf",
}: DocumentViewerProps) {
  const router = useRouter();

  // Toolbar & Görüntüleyici State
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 16;
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);
  const [searchInDoc, setSearchInDoc] = useState("");
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [isOcrLayerActive, setIsOcrLayerActive] = useState(false);

  // Klasördeki evraklar listesi (Screenshot 5 sol panel paritesi)
  const dossierDocs = [
    {
      id: "doc-sozlesme-1",
      barcode: "djt38",
      title: "Hizmet Alımına Ait Sözleşme (IKN 2019/583431)",
      date: "12.02.2020",
      pageCount: 16,
      type: "application/pdf",
    },
    {
      id: "doc-diploma-2",
      barcode: "djt38",
      title: "Diploma ve Mezuniyet Belgesi Sureti",
      date: "12.02.2020",
      pageCount: 2,
      type: "image/tiff",
    },
    {
      id: "doc-kimlik-3",
      barcode: "djt38",
      title: "T.C. Nüfus Cüzdanı ve Pasaport Fotokopisi",
      date: "12.02.2020",
      pageCount: 1,
      type: "image/tiff",
    },
    {
      id: "doc-ihale-4",
      barcode: "djt38",
      title: "İhale Kararı ve Yetkilendirme Onayı",
      date: "12.02.2020",
      pageCount: 4,
      type: "application/pdf",
    },
  ];

  function handleRotate() {
    setRotation((r) => (r + 90) % 360);
    toast.info(`Belge 90° döndürüldü (Güncel: ${(rotation + 90) % 360}°).`);
  }

  function handleZoomIn() {
    setZoomLevel((z) => Math.min(z + 20, 200));
  }

  function handleZoomOut() {
    setZoomLevel((z) => Math.max(z - 20, 50));
  }

  function handleFitWidth() {
    setZoomLevel(100);
    toast.info("Sayfa genişliği pencereye sığdırıldı.");
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] overflow-hidden font-sans bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-xl">
      {/* ========================================================================= */}
      {/* 1. ÜST BUTON VE EYLEM ŞERİDİ (Screenshot 5 Top Ribbon)                     */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#0284c7] px-3 py-1.5 text-xs text-white shadow-md">
        {/* Sol Navigasyon Butonları */}
        <div className="flex items-center gap-1.5">
          <Link
            href="/dosya-islemleri"
            className="inline-flex items-center gap-1 rounded bg-sky-700 hover:bg-sky-800 px-2.5 py-1 font-semibold transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Geri</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded bg-sky-800 hover:bg-sky-900 px-2.5 py-1 font-semibold transition-colors"
          >
            <Home className="size-3.5" />
            <span>Ana Sayfa</span>
          </Link>
        </div>

        {/* Orta İşlem Butonları (Screenshot 5 Paritesi) */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Dosyadan Ara */}
          <button
            type="button"
            onClick={() => {
              const q = prompt("Dosya içinde aranacak kelime:");
              if (q) {
                setSearchInDoc(q);
                toast.success(`"${q}" kelimesi belge içinde vurgulandı.`);
              }
            }}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <Search className="size-3" />
            <span>Dosyadan Ara</span>
          </button>

          {/* Ödünç İste */}
          <button
            type="button"
            onClick={() => {
              router.push("/odunc");
              toast.info("Ödünç verme ve talep sihirbazına yönlendiriliyorsunuz.");
            }}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <HandCoins className="size-3" />
            <span>Ödünç İste</span>
          </button>

          {/* PDF Editörde Aç */}
          <button
            type="button"
            onClick={() => toast.info("PDF Editörü ve Sayfa Manipülasyon Stüdyosu açıldı.")}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <FileText className="size-3" />
            <span>PDF Editörde Aç</span>
          </button>

          {/* Kalite Kontrolde Aç */}
          <button
            type="button"
            onClick={() => toast.info("Kalite kontrol ve OCR doğrulama modu devrede.")}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <ShieldCheck className="size-3" />
            <span>Kalite Kontrolde Aç</span>
          </button>

          {/* Tekrar Çevir */}
          <button
            type="button"
            onClick={() => {
              setIsOcrLayerActive(!isOcrLayerActive);
              toast.success("Tesseract OCR katmanı yeniden oluşturuldu.");
            }}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <RefreshCw className="size-3" />
            <span>Tekrar Çevir</span>
          </button>

          {/* İndir */}
          <button
            type="button"
            onClick={() => toast.success("Aktif sayfa/evrak PDF formatında indiriliyor.")}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <Download className="size-3" />
            <span>İndir</span>
          </button>

          {/* Dosyayı İndir */}
          <button
            type="button"
            onClick={() => toast.success(`Klasörün (${folderBarcode}) tüm belgeleri ZIP olarak indiriliyor.`)}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <FolderArchive className="size-3" />
            <span>Dosyayı İndir</span>
          </button>

          {/* Dijital Paylaş */}
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              toast.success("Güvenli belge erişim bağlantısı panoya kopyalandı.");
            }}
            className="inline-flex items-center gap-1 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 font-semibold transition-colors"
          >
            <Share2 className="size-3" />
            <span>Dijital Paylaş</span>
          </button>
        </div>

        {/* Sağ @Özet Bilgi */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowMetadata(!showMetadata)}
            className={`inline-flex items-center gap-1 rounded px-2.5 py-1 font-bold text-xs transition-colors ${
              showMetadata ? "bg-white text-sky-700" : "bg-sky-800 hover:bg-sky-900 text-white"
            }`}
          >
            <Info className="size-3.5" />
            <span>@Özet Bilgi</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. GÖRÜNTÜLEYİCİ ÇALIŞMA ALANI: SOL BELGE AĞACI + SAĞ KANVAS                */}
      {/* ========================================================================= */}
      <div className="flex flex-1 overflow-hidden">
        {/* SOL YAN PANEL: KLASÖRDEKİ EVRAKLAR VE SAYFALAR (Screenshot 5 Left Panel) */}
        {showSidebar && (
          <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col justify-between overflow-hidden">
            {/* Arama Kutusu */}
            <div className="p-2 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchInDoc}
                  onChange={(e) => setSearchInDoc(e.target.value)}
                  placeholder="Evrak içinde ara..."
                  className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Dosyaya Ait Evraklar Listesi */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Klasördeki Belgeler ({dossierDocs.length})
              </span>

              {dossierDocs.map((doc, idx) => {
                const isActive = activeDocIndex === idx;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setActiveDocIndex(idx)}
                    className={`flex flex-col gap-0.5 p-2 rounded-lg cursor-pointer transition-colors border ${
                      isActive
                        ? "bg-sky-950/80 border-sky-500 text-white shadow-xs"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-sky-400 font-bold">
                        {doc.barcode} [{doc.type === "application/pdf" ? "PDF" : "TIFF"}]
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{doc.date}</span>
                    </div>
                    <span className="font-semibold text-xs leading-snug truncate">
                      {doc.title}
                    </span>
                    <span className="text-[10px] text-slate-400">{doc.pageCount} Sayfa</span>
                  </div>
                );
              })}

              {/* Sayfa Küçük Resimleri / Sayfa Numaraları */}
              <div className="pt-3 border-t border-slate-800 mt-2 flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Sayfa İndeksi (1 - {totalPages})
                </span>
                <div className="grid grid-cols-4 gap-1.5 p-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`h-9 rounded flex flex-col items-center justify-center text-xs font-mono font-bold transition-all border ${
                        currentPage === page
                          ? "bg-sky-600 text-white border-sky-400 shadow-xs"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <span>{page}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sol Alt Durum Çubuğu */}
            <div className="p-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>{dossierDocs[activeDocIndex].barcode}</span>
              <span>Sayfa: {currentPage} / {totalPages}</span>
            </div>
          </aside>
        )}

        {/* SAĞ ANA ALAN: PDF TOOLBAR + DÖKÜMAN KANVASI (Screenshot 5 Viewer) */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-900">
          {/* PDF Standart Araç Çubuğu */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-1.5 text-xs text-slate-300">
            {/* Sayfa Gezinme */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSidebar(!showSidebar)}
                className="rounded p-1 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Kenar Çubuğunu Gizle / Göster"
              >
                <Layers className="size-4" />
              </button>

              <div className="flex items-center gap-1 font-mono">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="rounded p-1 hover:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-white text-xs">
                  {currentPage}
                </span>
                <span className="text-slate-500">/</span>
                <span>{totalPages}</span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="rounded p-1 hover:bg-slate-800 disabled:opacity-30"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Yakınlaştırma & Döndürme */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 font-mono">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="rounded p-1 hover:bg-slate-800"
                  title="Uzaklaştır"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <span className="text-xs px-1 w-12 text-center">{zoomLevel}%</span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="rounded p-1 hover:bg-slate-800"
                  title="Yakınlaştır"
                >
                  <ZoomIn className="size-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleFitWidth}
                className="rounded px-2 py-0.5 hover:bg-slate-800 text-[11px] font-medium"
              >
                Sayfayı Sığdır
              </button>

              <button
                type="button"
                onClick={handleRotate}
                className="rounded p-1 hover:bg-slate-800"
                title="90° Döndür"
              >
                <RotateCw className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="rounded p-1 hover:bg-slate-800"
                title="Yazdır"
              >
                <Printer className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Döküman Görüntüleme Kanvası (Screenshot 5 Sözleşme Metni) */}
          <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-900/90">
            <div
              style={{
                transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
              }}
              className="relative w-full max-w-3xl bg-white text-slate-900 shadow-2xl rounded-sm p-12 min-h-[1050px] font-serif leading-relaxed text-xs border border-slate-300 select-text"
            >
              {/* Belge Başlığı (Screenshot 5 Tam Metin Paritesi) */}
              <div className="text-center flex flex-col gap-1.5 pb-6 border-b border-slate-300">
                <h2 className="text-sm font-bold tracking-tight text-slate-950 uppercase">
                  İstanbul Üniversitesi Edebiyat Fakültesi Öğrenci Dosyalarının Dijitalleştirilmesi
                </h2>
                <h3 className="text-xs font-black tracking-wider text-slate-800 uppercase">
                  HİZMETİ ALIMINA AİT SÖZLEŞME
                </h3>
                <span className="font-mono text-[11px] font-bold text-slate-700 mt-1">
                  İKN (İhale Kayıt Numarası): 2019/583431
                </span>
              </div>

              {/* Madde 1 */}
              <div className="mt-5 flex flex-col gap-1">
                <h4 className="font-bold text-slate-900">Madde 1 - Sözleşmenin tarafları</h4>
                <p className="text-justify text-slate-800">
                  Bu Sözleşme, bir tarafta <strong>Sağlık, Kültür ve Spor Daire Başkanlığı YÜKSEKÖĞRETİM KURUMLARI İSTANBUL ÜNİVERSİTESİ</strong> (bundan sonra İdare olarak anılacaktır) ile diğer tarafta <strong>Dijital Arşiv Belge Bilgi Teknolojileri San. ve Tic. A.Ş.</strong> (bundan sonra Yüklenici olarak anılacaktır) arasında aşağıda yazılı şartlar dahilinde akdedilmiştir.
                </p>
              </div>

              {/* Madde 2 */}
              <div className="mt-5 flex flex-col gap-2">
                <h4 className="font-bold text-slate-900">Madde 2 - Taraflara ilişkin bilgiler</h4>

                <div className="flex flex-col gap-1 pl-3 border-l-2 border-slate-300">
                  <span className="font-bold text-slate-900">2.1. İdarenin</span>
                  <div className="grid grid-cols-1 gap-0.5 text-slate-800">
                    <span><strong>a) Adı:</strong> Sağlık, Kültür ve Spor Daire Başkanlığı İSTANBUL ÜNİVERSİTESİ</span>
                    <span><strong>b) Adresi:</strong> Süleymaniye Mah. Süleymaniye Cad. 15/2 34116 Vezneciler - FATİH / İSTANBUL</span>
                    <span><strong>c) Telefon numarası:</strong> 0212 440 00 67</span>
                    <span><strong>ç) Faks numarası:</strong> 0212 440 00 12</span>
                    <span><strong>d) Elektronik posta adresi:</strong> skssatinalma@istanbul.edu.tr</span>
                    <span><strong>e) Elektronik tebligat adresi:</strong> ekap</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 pl-3 border-l-2 border-slate-300 mt-2">
                  <span className="font-bold text-slate-900">2.2. Yüklenicinin</span>
                  <div className="grid grid-cols-1 gap-0.5 text-slate-800">
                    <span><strong>a) Adı ve soyadı / Ticaret unvanı:</strong> Dijital Arşiv Belge Bilgi Teknolojileri San. ve Tic. A.Ş.</span>
                    <span><strong>b) T.C. Kimlik No:</strong> 28491028491</span>
                    <span><strong>c) Vergi Kimlik No:</strong> 2950 9353 18</span>
                    <span><strong>ç) Yüklenicinin tebligata esas adresi:</strong> Selami Ali Mah. Cumhuriyet Cad. No: 30/2 Fıstıkağacı - Üsküdar / İSTANBUL</span>
                    <span><strong>d) Telefon numarası:</strong> 0216 492 75 75</span>
                    <span><strong>e) Bildirime esas faks numarası:</strong> 0216 532 47 00</span>
                    <span><strong>f) Elektronik posta adresi:</strong> info@dijitalarsiv.com</span>
                  </div>
                </div>
              </div>

              {/* Madde 3 */}
              <div className="mt-5 flex flex-col gap-1">
                <h4 className="font-bold text-slate-900">Madde 3 - İşin konusu ve kapsamı</h4>
                <p className="text-justify text-slate-800">
                  İşbu sözleşmenin konusu; İstanbul Üniversitesi Edebiyat Fakültesi Öğrenci İşleri Arşivi bünyesinde yer alan özlük ve mezuniyet dosyalarının ayıklama, tasnif, barkodlama, yüksek çözünürlüklü endüstriyel tarama, OCR indeksleme ve Kurumsal Dijital Arşiv Yönetim Sistemine aktarılması işidir.
                </p>
              </div>

              {/* Resmî Kaşe & E-İmza Alanı */}
              <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="flex flex-col items-center">
                  <span className="font-bold text-slate-900">İDARE</span>
                  <span className="text-[11px] text-slate-600">Sağlık, Kültür ve Spor Daire Başkanı</span>
                  <div className="mt-4 rounded border border-dashed border-emerald-600 bg-emerald-50 px-4 py-2 text-[10px] font-mono font-bold text-emerald-800">
                    ✓ 5070 Sayılı Kanun Uyarınca E-İmzalanmıştır<br />
                    Tarih: 12.02.2020 16:27:17
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <span className="font-bold text-slate-900">YÜKLENİCİ</span>
                  <span className="text-[11px] text-slate-600">Dijital Arşiv Belge Bilgi Teknolojileri A.Ş.</span>
                  <div className="mt-4 rounded border border-dashed border-sky-600 bg-sky-50 px-4 py-2 text-[10px] font-mono font-bold text-sky-800">
                    ✓ Şirket Temsil Yetkilisi E-İmza<br />
                    Tarih: 12.02.2020 16:28:11
                  </div>
                </div>
              </div>

              {/* Sayfa Altlığı */}
              <div className="absolute bottom-4 left-12 right-12 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-200 pt-2">
                <span>MBB Arşiv Güvenlik Kodu: 2019-583431-SEC</span>
                <span>Sayfa {currentPage} / {totalPages}</span>
              </div>
            </div>
          </div>
        </main>

        {/* SAĞ KENAR: @ÖZET BİLGİ PANELİ */}
        {showMetadata && (
          <aside className="w-80 shrink-0 border-l border-slate-800 bg-slate-950 p-4 flex flex-col gap-3 text-xs overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Info className="size-4 text-sky-400" />
                @Özet Bilgi (Üstveri)
              </span>
              <button
                type="button"
                onClick={() => setShowMetadata(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-400">Belge Başlığı</span>
                <span className="font-bold text-white">{documentTitle}</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-400">Klasör Barkodu & Adı</span>
                <span className="font-mono text-sky-400 font-bold">{folderBarcode}</span>
                <span className="text-slate-200">{folderTitle}</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-400">Yasal Saklama & Güvenlik</span>
                <div className="flex items-center gap-1 mt-1">
                  <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
                    TS 13298 Uyumlu
                  </Badge>
                  <Badge className="bg-sky-600 text-white font-mono text-[10px]">
                    Temiz (ClamAV)
                  </Badge>
                </div>
              </div>

              <div className="flex flex-col gap-0.5 pt-2 border-t border-slate-800">
                <span className="text-[10px] text-slate-400">Taranma Tarihi</span>
                <span className="font-mono text-slate-200">12.02.2020 16:27:17</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-400">Taranan Donanım</span>
                <span className="text-slate-200">Fujitsu fi-7160 ADF Ağ Tarayıcısı</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-400">Çözünürlük & Renk</span>
                <span className="font-mono text-slate-200">300 DPI · 24-Bit Renkli · Optik Çarpıklık Giderildi</span>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
