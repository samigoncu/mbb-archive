"use client";

import { useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  HardDrive,
  Key,
  Layers,
  Lock,
  Printer,
  RefreshCw,
  Save,
  Search,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type ReportType =
  | "indekslenen-evrak"
  | "taranan-evrak"
  | "indekslenen-dosya"
  | "kullanici-hata"
  | "dosya-alanlari"
  | "evrak-tipleri"
  | "silinen-evrak"
  | "odunc-verilen"
  | "imha-edilen";

const REPORT_TYPES: { id: ReportType; label: string; icon: any }[] = [
  { id: "indekslenen-evrak", label: "İndekslenen Evrak Sayısı Raporu", icon: FileText },
  { id: "taranan-evrak", label: "Taranan Evrak Sayısı Raporu", icon: Layers },
  { id: "indekslenen-dosya", label: "İndekslenen Dosya Sayısı Raporu", icon: BarChart3 },
  { id: "kullanici-hata", label: "Kullanıcı Hata Raporu", icon: AlertCircle },
  { id: "dosya-alanlari", label: "Dosya Alanları Raporu", icon: SlidersHorizontal },
  { id: "evrak-tipleri", label: "Evrak Tipleri Raporu", icon: FileText },
  { id: "silinen-evrak", label: "Silinen Evrak Raporu", icon: X },
  { id: "odunc-verilen", label: "Ödünç Verilen Dosya Raporu", icon: UserCheck },
  { id: "imha-edilen", label: "İmha Edilen Evrak Raporu", icon: ShieldCheck },
];

const MOCK_REPORT_ROWS = [
  { id: "1", date: "2024-03-04 15:42", user: "alimete", name: "Ali METE", unit: "İhale ve Projeler", action: "İndeksleme Tamamlandı", barcode: "50.1-2024-8", pages: 17, status: "Başarılı" },
  { id: "2", date: "2024-03-04 15:10", user: "aysen_k", name: "Ayşen KÜYÜK", unit: "Genel Yönetim", action: "Evrak Tarama & OCR", barcode: "50.1-2024-7", pages: 24, status: "Başarılı" },
  { id: "3", date: "2024-03-04 14:35", user: "mehmet.zahid", name: "Mehmet Zahid METE", unit: "Mali İşler", action: "Satış Faturası İndeksleme", barcode: "APV2023000000004", pages: 4, status: "Başarılı" },
  { id: "4", date: "2024-03-04 13:55", user: "alimete", name: "Ali METE", unit: "İhale ve Projeler", action: "İhale Kararı Ek Belge", barcode: "50.1-2024-6", pages: 8, status: "Başarılı" },
  { id: "5", date: "2024-03-04 11:20", user: "test.user", name: "Test Operatör", unit: "Bilgi İşlem", action: "Barkod Eşleştirme Hatası", barcode: "50.1-2024-9", pages: 1, status: "Düzeltildi" },
  { id: "6", date: "2024-03-04 10:15", user: "aysen_k", name: "Ayşen KÜYÜK", unit: "Genel Yönetim", action: "Gelen Yazı İndeksi", barcode: "GGY-2024-112", pages: 2, status: "Başarılı" },
  { id: "7", date: "2024-03-04 09:30", user: "alimete", name: "Ali METE", unit: "İhale ve Projeler", action: "Sözleşme Taslağı Yükleme", barcode: "AP-2021-1-01", pages: 12, status: "Başarılı" },
  { id: "8", date: "2024-03-03 16:45", user: "veyis_a", name: "Veyis AYDEMİR", unit: "Hukuk İşleri", action: "Ödünç Dosya Teslimi", barcode: "50.1-2024-1", pages: 45, status: "Başarılı" },
];

const MOCK_AUDIT_LOGS = [
  { id: "log-1", time: "2024-03-04 15:45:12", user: "alimete", ip: "192.168.1.104", event: "Dosya Görüntüleme", target: "50.1-2024-8 (Sözleşme Belgesi)", level: "Bilgi" },
  { id: "log-2", time: "2024-03-04 15:42:01", user: "alimete", ip: "192.168.1.104", event: "İndeks Kaydı", target: "50.1-2024-8", level: "Bilgi" },
  { id: "log-3", time: "2024-03-04 14:15:33", user: "arsiv_admin", ip: "192.168.1.102", event: "Kullanıcı Yetki Güncelleme", target: "indekskullanici2", level: "Önemli" },
  { id: "log-4", time: "2024-03-04 13:02:19", user: "aysen_k", ip: "192.168.1.108", event: "PDF Belge İndirme", target: "50.1-2024-7.pdf", level: "Bilgi" },
  { id: "log-5", time: "2024-03-04 09:00:22", user: "arsiv_admin", ip: "192.168.1.102", event: "Sistem Oturum Açma", target: "Kurumsal Portal", level: "Bilgi" },
];

export function SettingsManagerView() {
  // Ana Menü Sekmesi: raporlar | sistem | guvenlik | entegrasyon
  const [activeMainTab, setActiveMainTab] = useState<
    "raporlar" | "sistem" | "guvenlik" | "entegrasyon"
  >("raporlar");

  // Rapor Türü
  const [selectedReport, setSelectedReport] = useState<ReportType>("indekslenen-evrak");
  const [dateStart, setDateStart] = useState("2024-01-01");
  const [dateEnd, setDateEnd] = useState("2024-03-04");
  const [userFilter, setUserFilter] = useState("Tümü");
  const [unitFilter, setUnitFilter] = useState("Tümü");

  // Sistem Parametreleri Formu
  const [ocrEngine, setOcrEngine] = useState("Tesseract 5.3 (Türkçe Eğitilmiş)");
  const [ocrDpi, setOcrDpi] = useState("300 DPI");
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [maxUploadMb, setMaxUploadMb] = useState("50");
  const [ts13298Mode, setTs13298Mode] = useState(true);
  const [autoOcr, setAutoOcr] = useState(true);

  return (
    <div className="flex flex-col gap-4 font-sans text-xs">
      {/* 1. ÜST BAŞLIK VE ANA SEKMELER (Tanımlardaki gibi 4 Sekme) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs">
            <Settings className="size-3.5" />
            <span>Ayarlar & Yönetim Portalı</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveMainTab("raporlar")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeMainTab === "raporlar"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Kullanıcı Raporları ★
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("sistem")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeMainTab === "sistem"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Sistem Parametreleri ★
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("guvenlik")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeMainTab === "guvenlik"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Güvenlik & Denetim İzi ★
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("entegrasyon")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeMainTab === "entegrasyon"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Yedekleme & Entegrasyon ★
            </button>
          </div>
        </div>
      </div>

      {/* 2. SEKME 1: KULLANICI RAPORLARI (9 d-DAYSİS Raporu) */}
      {activeMainTab === "raporlar" && (
        <div className="flex flex-col gap-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs font-semibold">
            <span className="rounded bg-sky-600 text-white px-2 py-0.5 text-[11px] font-mono">
              # Ayarlar
            </span>
            <span className="rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[11px] font-mono">
              Kullanıcı Raporları
            </span>
          </div>

          {/* 9 RAPOR SEÇİM BUTONU ÇUBUĞU */}
          <div className="flex flex-wrap items-center gap-1 border-b border-border pb-2 overflow-x-auto">
            {REPORT_TYPES.map((rep) => {
              const Icon = rep.icon;
              const isSelected = selectedReport === rep.id;
              return (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => {
                    setSelectedReport(rep.id);
                    toast.info(`"${rep.label}" yüklendi.`);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    isSelected
                      ? "bg-[#f59e0b] text-white shadow-xs"
                      : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span>{rep.label}</span>
                </button>
              );
            })}
          </div>

          {/* FİLTRELEME VE EYLEM ÇUBUĞU */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                <span className="font-semibold text-muted-foreground">Tarih:</span>
                <Input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="h-8 text-xs w-32"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="h-8 text-xs w-32"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Users className="size-3.5 text-muted-foreground" />
                <span className="font-semibold text-muted-foreground">Kullanıcı:</span>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground"
                >
                  <option value="Tümü">Tüm Kullanıcılar</option>
                  <option value="alimete">Ali METE</option>
                  <option value="aysen_k">Ayşen KÜYÜK</option>
                  <option value="mehmet.zahid">Mehmet Zahid METE</option>
                  <option value="veyis_a">Veyis AYDEMİR</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Building2 className="size-3.5 text-muted-foreground" />
                <span className="font-semibold text-muted-foreground">Birim:</span>
                <select
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                  className="h-8 rounded border border-border bg-background px-2 text-xs text-foreground"
                >
                  <option value="Tümü">Tüm Birimler</option>
                  <option value="İhale ve Projeler">İhale ve Projeler Direktörlüğü</option>
                  <option value="Mali İşler">Mali İşler Direktörlüğü</option>
                  <option value="Genel Yönetim">Genel Yönetim İşleri</option>
                </select>
              </div>

              <Button
                size="sm"
                onClick={() => toast.success("Rapor verileri filtrelendi.")}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-8 text-xs gap-1"
              >
                <Filter className="size-3.5" />
                <span>Sorgula</span>
              </Button>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success("Rapor Excel (xlsx) olarak indirildi.")}
                className="gap-1 h-8 text-xs font-semibold text-emerald-600 border-emerald-300"
              >
                <FileSpreadsheet className="size-3.5" />
                <span>Excel (xlsx)</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success("Rapor CSV olarak indirildi.")}
                className="gap-1 h-8 text-xs font-semibold text-blue-600 border-blue-300"
              >
                <FileText className="size-3.5" />
                <span>CSV</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.print();
                  toast.info("Yazdırma penceresi açıldı.");
                }}
                className="gap-1 h-8 text-xs font-semibold"
              >
                <Printer className="size-3.5" />
                <span>Yazdır</span>
              </Button>
            </div>
          </div>

          {/* KPI ÖZET KARTLARI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border bg-card p-3 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Toplam İşlem Hacmi</span>
                <span className="text-xl font-black text-foreground">14.820</span>
              </div>
              <div className="size-9 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                <FileText className="size-4.5" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Bugünkü İşlem Sayısı</span>
                <span className="text-xl font-black text-emerald-600">342</span>
              </div>
              <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="size-4.5" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Hata / Düzeltme Oranı</span>
                <span className="text-xl font-black text-amber-600">%0.04</span>
              </div>
              <div className="size-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <AlertCircle className="size-4.5" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-muted-foreground block text-[11px] font-medium">Aktif Operatör</span>
                <span className="text-xl font-black text-primary">8 Personel</span>
              </div>
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Users className="size-4.5" />
              </div>
            </div>
          </div>

          {/* RAPOR VERİ TABLOSU */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
              <span className="font-bold text-foreground">
                {REPORT_TYPES.find((r) => r.id === selectedReport)?.label} Veri Tablosu
              </span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {MOCK_REPORT_ROWS.length} Kayıt Listelendi
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/70 text-foreground font-bold border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">S.</th>
                    <th className="py-2.5 px-3">TARİH & SAAT</th>
                    <th className="py-2.5 px-3">KULLANICI</th>
                    <th className="py-2.5 px-3">BİRİMİ</th>
                    <th className="py-2.5 px-3">İŞLEM AÇIKLAMASI</th>
                    <th className="py-2.5 px-3">DOSYA BARKODU</th>
                    <th className="py-2.5 px-3 w-16 text-center">SAYFA</th>
                    <th className="py-2.5 px-3 w-24 text-center">DURUM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MOCK_REPORT_ROWS.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                      <td className="py-2 px-3 text-center font-mono text-muted-foreground">{row.id}</td>
                      <td className="py-2 px-3 font-mono text-muted-foreground">{row.date}</td>
                      <td className="py-2 px-3 font-semibold text-foreground">
                        {row.name} <span className="font-mono text-muted-foreground text-[10px]">({row.user})</span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{row.unit}</td>
                      <td className="py-2 px-3 font-medium text-foreground">{row.action}</td>
                      <td className="py-2 px-3 font-mono font-bold text-sky-600">{row.barcode}</td>
                      <td className="py-2 px-3 text-center font-mono">{row.pages}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. SEKME 2: SİSTEM PARAMETRELERİ */}
      {activeMainTab === "sistem" && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              Sistem Çalışma Parametreleri & TS 13298
            </h3>
            <Button
              size="sm"
              onClick={() => toast.success("Sistem parametreleri kaydedildi.")}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-8 text-xs gap-1"
            >
              <Save className="size-3.5" />
              <span>Parametreleri Kaydet</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold text-foreground">OCR Motoru & Dil Paketi</Label>
              <Input value={ocrEngine} onChange={(e) => setOcrEngine(e.target.value)} />
              <span className="text-[11px] text-muted-foreground">Tesseract OCR v5.3 motoru arka planda asenkron çalışır.</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold text-foreground">Tarama & OCR Çözünürlüğü</Label>
              <select
                value={ocrDpi}
                onChange={(e) => setOcrDpi(e.target.value)}
                className="h-8.5 rounded-lg border border-border bg-background px-3 text-xs text-foreground"
              >
                <option value="200 DPI">200 DPI (Standart Hızlı)</option>
                <option value="300 DPI">300 DPI (TS 13298 Standart Önerilen)</option>
                <option value="400 DPI">400 DPI (Yüksek Kalite)</option>
                <option value="600 DPI">600 DPI (Tarihi Belge Arşivi)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold text-foreground">Oturum Zaman Aşımı (Dakika)</Label>
              <Input
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="font-semibold text-foreground">Maksimum Evrak Yükleme Boyutu (MB)</Label>
              <Input
                type="number"
                value={maxUploadMb}
                onChange={(e) => setMaxUploadMb(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ts13298"
                checked={ts13298Mode}
                onChange={(e) => setTs13298Mode(e.target.checked)}
                className="size-4 rounded border-border"
              />
              <Label htmlFor="ts13298" className="font-bold text-foreground cursor-pointer">
                TS 13298 Elektronik Belge ve Arşiv Yönetimi Uyumluluk Modu (Zorunlu Denetim İzi & E-İmza)
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto-ocr"
                checked={autoOcr}
                onChange={(e) => setAutoOcr(e.target.checked)}
                className="size-4 rounded border-border"
              />
              <Label htmlFor="auto-ocr" className="font-bold text-foreground cursor-pointer">
                Taranan / Yüklenen Evraklarda Otomatik OCR Metin Katmanı Oluşturma
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* 4. SEKME 3: GÜVENLİK & DENETİM İZİ (AUDIT LOG) */}
      {activeMainTab === "guvenlik" && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Lock className="size-4 text-primary" />
                Güvenlik Olayları & Değiştirilemez Denetim İzi (Audit Trail)
              </h3>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                5070 Sayılı Elektronik İmza Kanunu ve KVKK gereği tüm kullanıcı hareketleri kriptografik zaman damgasıyla kaydedilir.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Denetim izi raporu indirildi.")}
              className="h-8 text-xs font-semibold gap-1"
            >
              <Download className="size-3.5" />
              <span>Logları Dışa Aktar</span>
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/70 text-foreground font-bold border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">ZAMAN DAMGASI</th>
                  <th className="py-2.5 px-3">KULLANICI</th>
                  <th className="py-2.5 px-3 font-mono">IP ADRESİ</th>
                  <th className="py-2.5 px-3">OLAY TÜRÜ</th>
                  <th className="py-2.5 px-3">HEDEF / KAYIT</th>
                  <th className="py-2.5 px-3 w-20 text-center">SEVİYE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_AUDIT_LOGS.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                    <td className="py-2 px-3 font-mono text-muted-foreground">{log.time}</td>
                    <td className="py-2 px-3 font-semibold text-foreground">{log.user}</td>
                    <td className="py-2 px-3 font-mono text-sky-600">{log.ip}</td>
                    <td className="py-2 px-3 font-medium text-foreground">{log.event}</td>
                    <td className="py-2 px-3 text-muted-foreground font-mono">{log.target}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {log.level}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SEKME 4: YEDEKLEME & ENTEGRASYON */}
      {activeMainTab === "entegrasyon" && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Server className="size-4 text-primary" />
              Yedekleme & Kurumsal Entegrasyonlar
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border p-3.5 flex flex-col gap-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Active Directory (LDAP)</span>
                <Badge variant="outline" className="text-emerald-600 border-emerald-300">Bağlı</Badge>
              </div>
              <p className="text-muted-foreground text-[11px]">Sunucu: ldap://mbb.local:389 · Kurumsal kimlik doğrulama devrede.</p>
              <Button size="sm" variant="outline" onClick={() => toast.info("Kullanıcılar senkronize ediliyor...")} className="h-7 text-xs mt-1">
                Kullanıcıları Senkronize Et
              </Button>
            </div>

            <div className="rounded-lg border border-border p-3.5 flex flex-col gap-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">KamuSM Zaman Damgası</span>
                <Badge variant="outline" className="text-emerald-600 border-emerald-300">Aktif</Badge>
              </div>
              <p className="text-muted-foreground text-[11px]">TSA URL: zd.kamusm.gov.tr:443 · Kalan Kontör: 48.500 Damga.</p>
              <Button size="sm" variant="outline" onClick={() => toast.success("Zaman damgası bağlantısı doğrulandı.")} className="h-7 text-xs mt-1">
                Bağlantıyı Doğrula
              </Button>
            </div>

            <div className="rounded-lg border border-border p-3.5 flex flex-col gap-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">Otomatik Arşiv Yedekleme</span>
                <Badge variant="outline" className="text-blue-600 border-blue-300">Her Gece 02:00</Badge>
              </div>
              <p className="text-muted-foreground text-[11px]">Hedef: NAS Storage /backup/mbb_archive/ · AES-256 Şifreli.</p>
              <Button size="sm" variant="outline" onClick={() => toast.info("Manuel yedekleme görevi tetiklendi.")} className="h-7 text-xs mt-1">
                Şimdi Yedek Al
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
