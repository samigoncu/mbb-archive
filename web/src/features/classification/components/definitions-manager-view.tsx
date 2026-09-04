"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  FolderTree,
  Globe,
  HardDrive,
  Home,
  Layers,
  Plus,
  Printer,
  Save,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FilePlanManager } from "@/features/classification/components/file-plan-manager";
import type { FilePlanListItem, FilePlanTree } from "@/features/classification/model/classification";

export type UnitItem = {
  id: string;
  order: number;
  name: string;
  parentName?: string;
  shortName?: string;
  code?: string;
};

export type FtpItem = {
  id: string;
  order: number;
  name: string;
  server: string;
  port: number;
  type: string;
  username: string;
  ssl: boolean;
};

export type SeriesItem = {
  id: string;
  order: number;
  name: string;
  code: string;
  unit: string;
  topic: string;
  bss: number;
  kss: number;
  ocr: "Var" | "Yok";
  active: boolean;
};

export type SystemUser = {
  id: string;
  order: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  status: "Aktif" | "Pasif";
};

export type SystemRole = {
  id: string;
  order: number;
  name: string;
};

export type PermissionRow = {
  id: string;
  name: string;
  view: boolean;
  add: boolean;
  edit: boolean;
  del: boolean;
};

const DEFAULT_UNITS: UnitItem[] = [
  { id: "1", order: 1, name: "DİJİTAL ARŞİV BELGE BİLGİ TEKNOLOJİLERİ A.Ş.", parentName: "Ana Birim", shortName: "DJT", code: "900.01" },
  { id: "2", order: 2, name: "İHALE VE PROJELER DİREKTÖRLÜĞÜ", parentName: "DİJİTAL ARŞİV BELGE BİLGİ TEKNOLOJİLERİ A.Ş.", shortName: "İPD", code: "900.02" },
  { id: "3", order: 3, name: "MALİ İŞLER DİREKTÖRLÜĞÜ", parentName: "DİJİTAL ARŞİV BELGE BİLGİ TEKNOLOJİLERİ A.Ş.", shortName: "MİD", code: "900.03" },
  { id: "4", order: 4, name: "BİLGİ TEKNOLOJİLERİ DİREKTÖRLÜĞÜ", parentName: "DİJİTAL ARŞİV BELGE BİLGİ TEKNOLOJİLERİ A.Ş.", shortName: "BTD", code: "900.04" },
  { id: "5", order: 5, name: "İK VE EĞİTİM DİREKTÖRLÜĞÜ", parentName: "DİJİTAL ARŞİV BELGE BİLGİ TEKNOLOJİLERİ A.Ş.", shortName: "İK", code: "900.05" },
  { id: "6", order: 6, name: "HUKUK İŞLERİ DİREKTÖRLÜĞÜ", parentName: "DİJİTAL ARŞİV BELGE BİLGİ TEKNOLOJİLERİ A.Ş.", shortName: "HUKUK", code: "900.06" },
  { id: "7", order: 7, name: "KURUMSAL MÜŞTERİ İLİŞKİLERİ", parentName: "DİJİTAL ARŞİV BELGE BİLGİ TEKNOLOJİLERİ A.Ş.", shortName: "KMİ", code: "900.07" },
  { id: "8", order: 8, name: "Yazı İşleri Koordinatörlüğü", parentName: "DİJİTAL ARŞİV BELGE BİLGİ TEKNOLOJİLERİ A.Ş.", shortName: "YİK", code: "900.08" },
  { id: "9", order: 9, name: "GENEL YÖNETİM İŞLERİ", parentName: "DİJİTAL ARŞİV BELGE BİLGİ TEKNOLOJİLERİ A.Ş.", shortName: "GYİ", code: "900.09" },
  { id: "10", order: 10, name: "YEDİTEPE ARŞİV VE YAZILIM HİZMETLERİ SAN.TİC.LTD.ŞTİ", parentName: "Ana Birim", shortName: "YEDİTEPE", code: "901.01" },
  { id: "11", order: 11, name: "Muhasebe Birimi", parentName: "YEDİTEPE ARŞİV VE YAZILIM HİZMETLERİ SAN.TİC.LTD.ŞTİ", shortName: "MUH", code: "901.02" },
  { id: "12", order: 12, name: "Yönetim Kurulu", parentName: "YEDİTEPE ARŞİV VE YAZILIM HİZMETLERİ SAN.TİC.LTD.ŞTİ", shortName: "YK", code: "901.03" },
  { id: "13", order: 13, name: "HİMMETOĞLU YAYINCILIK A.Ş.", parentName: "Ana Birim", shortName: "HİMMET", code: "902.01" },
];

const DEFAULT_FTPS: FtpItem[] = [
  { id: "1", order: 1, name: "djt_real", server: "localhost:21", port: 21, type: "FTP", username: "arsiv_admin", ssl: false },
  { id: "2", order: 2, name: "DijitalArsivFTP", server: "192.168.1.177", port: 21, type: "SFTP", username: "mbb_rootftp", ssl: true },
];

const DEFAULT_SERIES_LIST: SeriesItem[] = [
  { id: "1", order: 1, name: "Gelen - Giden Dosyası", code: "GGY", unit: "GENEL YÖNETİM İŞLERİ", topic: "Gelen - Giden Yazışma", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "2", order: 2, name: "GELEN TEKLİFLER", code: "GTY", unit: "GENEL YÖNETİM İŞLERİ", topic: "Gelen Teklifler", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "3", order: 3, name: "d-CoreBook Otomasyonu", code: "114.0", unit: "BİLGİ TEKNOLOJİLERİ DİREKTÖRLÜĞÜ", topic: "d-CoreBook Otomasyonu", bss: 24, kss: 240, ocr: "Yok", active: true },
  { id: "4", order: 4, name: "Banka İşlemleri", code: "BI", unit: "MALİ İŞLER DİREKTÖRLÜĞÜ", topic: "Banka İşlemleri", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "5", order: 5, name: "İhale Dosyası", code: "İHL", unit: "İHALE VE PROJELER DİREKTÖRLÜĞÜ", topic: "Arşiv Projeleri", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "6", order: 6, name: "Posta / Kargo Dosyası", code: "PAA", unit: "GENEL YÖNETİM İŞLERİ", topic: "Posta - Kargo Alındıları", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "7", order: 7, name: "Araç Dosyası", code: "ARC", unit: "MALİ İŞLER DİREKTÖRLÜĞÜ", topic: "Araç", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "8", order: 8, name: "Kartvizit Dosyası", code: "004.01", unit: "KURUMSAL MÜŞTERİ İLİŞKİLERİ", topic: "Kartvizitler", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "9", order: 9, name: "Yazılım Dosyası", code: "003.02", unit: "BİLGİ TEKNOLOJİLERİ DİREKTÖRLÜĞÜ", topic: "Yazılım Dosyası", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "10", order: 10, name: "Özlük Dosyası", code: "010.0", unit: "İK VE EĞİTİM DİREKTÖRLÜĞÜ", topic: "Personel Özlük Dosyası", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "11", order: 11, name: "Vergi - SGK Dosyası", code: "SGK", unit: "MALİ İŞLER DİREKTÖRLÜĞÜ", topic: "SGK", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "12", order: 12, name: "d-YTSCore Otomasyonu", code: "105.0", unit: "BİLGİ TEKNOLOJİLERİ DİREKTÖRLÜĞÜ", topic: "d-YTSCore Otomasyonu", bss: 24, kss: 240, ocr: "Yok", active: true },
  { id: "13", order: 13, name: "Sözleşmeler Dosyası", code: "SDZ", unit: "İHALE VE PROJELER DİREKTÖRLÜĞÜ", topic: "Sözleşmeler", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "14", order: 14, name: "MAAŞ DOSYASI", code: "MD", unit: "MALİ İŞLER DİREKTÖRLÜĞÜ", topic: "Maaş Dosyası", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "15", order: 15, name: "Fatura Alış", code: "AF", unit: "MALİ İŞLER DİREKTÖRLÜĞÜ", topic: "FATURA", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "16", order: 16, name: "Donanım Bakım", code: "003.04", unit: "BİLGİ TEKNOLOJİLERİ DİREKTÖRLÜĞÜ", topic: "Donanım Bakım", bss: 99, kss: 99, ocr: "Yok", active: true },
  { id: "17", order: 17, name: "Bakım Destek Sözleşmeleri", code: "50.1", unit: "İHALE VE PROJELER DİREKTÖRLÜĞÜ", topic: "Bakım Destek Dosyaları", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "18", order: 18, name: "Fatura Satış", code: "SF", unit: "MALİ İŞLER DİREKTÖRLÜĞÜ", topic: "Satış İşlemleri", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "19", order: 19, name: "Protokol - Anlaşma Dosyası", code: "10.0", unit: "GENEL YÖNETİM İŞLERİ", topic: "Protokol ve Sözleşme Dosyası", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "20", order: 20, name: "FİRMA DOSYALARI - YTP", code: "FMY", unit: "YEDİTEPE ARŞİV VE YAZILIM HİZMETLERİ SAN.TİC.LTD.ŞTİ", topic: "Firma Dosyaları", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "21", order: 21, name: "SATINALMA DOSYASI", code: "030.0", unit: "YEDİTEPE ARŞİV VE YAZILIM HİZMETLERİ SAN.TİC.LTD.ŞTİ", topic: "Satınalma Dosyası", bss: 0, kss: 0, ocr: "Yok", active: true },
  { id: "22", order: 22, name: "FİRMA DOSYALARI - DJT", code: "FMD", unit: "GENEL YÖNETİM İŞLERİ", topic: "Firma Dosyaları", bss: 0, kss: 0, ocr: "Yok", active: true },
];

const DEFAULT_USERS_LIST: SystemUser[] = [
  { id: "1", order: 1, username: "alimete", firstName: "Ali", lastName: "METE", role: "Server Admin", status: "Aktif" },
  { id: "2", order: 2, username: "ahmeterkam.mete", firstName: "Ahmet Erkam", lastName: "METE", role: "Direktör (İnsan Kaynakları | Mali İşler)", status: "Aktif" },
  { id: "3", order: 3, username: "mehmet.zahid", firstName: "Mehmet Zahid", lastName: "METE", role: "Server Admin", status: "Aktif" },
  { id: "4", order: 4, username: "muhammet.arif.mete", firstName: "Muhammet Arif", lastName: "Mete", role: "Server Admin", status: "Aktif" },
  { id: "5", order: 5, username: "indekskullanici", firstName: "İndeks", lastName: "Kullanıcı", role: "Server Admin", status: "Aktif" },
  { id: "6", order: 6, username: "indekskullanici2", firstName: "İndeks", lastName: "Kullanıcı2", role: "Server Admin", status: "Aktif" },
  { id: "7", order: 7, username: "tubakuloglu", firstName: "Tuba", lastName: "Kuloğlu", role: "Server Admin", status: "Pasif" },
  { id: "8", order: 8, username: "arzu.ayar", firstName: "Arzu", lastName: "Ayar", role: "Server Admin", status: "Aktif" },
  { id: "9", order: 9, username: "test.user", firstName: "test", lastName: "user", role: "Server Admin", status: "Aktif" },
  { id: "10", order: 10, username: "kubranur.guler", firstName: "Kübranur", lastName: "Güler", role: "Server Admin", status: "Aktif" },
];

const DEFAULT_ROLES_LIST: SystemRole[] = [
  { id: "1", order: 1, name: "Server Admin" },
  { id: "2", order: 2, name: "Koordinatör (Dış İlişkiler)" },
  { id: "3", order: 3, name: "Direktör (İnsan Kaynakları)" },
  { id: "4", order: 4, name: "Direktör (Bilgi Teknolojileri)" },
  { id: "5", order: 5, name: "Direktör (İhale&Operasyon)" },
  { id: "6", order: 6, name: "Genel Koordinatör" },
  { id: "7", order: 7, name: "İK - KVKK - Aşık" },
  { id: "8", order: 8, name: "Direktör (Mali İşler)" },
  { id: "9", order: 9, name: "Danışman (Hukuk)" },
  { id: "10", order: 10, name: "Direktör (Kurumsal İlişkiler)" },
  { id: "11", order: 11, name: "Eğitim Fakültesi" },
  { id: "12", order: 12, name: "Tıp Fakültesi" },
  { id: "13", order: 13, name: "Genel Müdür" },
];

const DEFAULT_PERMISSIONS: PermissionRow[] = [
  { id: "1", name: "Hazırlama İşlemleri", view: true, add: false, edit: false, del: false },
  { id: "2", name: "Arama Şablonu", view: false, add: false, edit: false, del: false },
  { id: "3", name: "Sadece Yüklediği Evrakları İndeksleyebilsin", view: false, add: false, edit: false, del: false },
  { id: "4", name: "Rol Tanımları", view: true, add: true, edit: true, del: false },
  { id: "5", name: "Tam Admin", view: true, add: true, edit: true, del: true },
  { id: "6", name: "Dosya Yükleme", view: true, add: true, edit: true, del: false },
  { id: "7", name: "Evrak İndeksleme", view: true, add: true, edit: true, del: false },
  { id: "8", name: "Arşiv Simülasyonu", view: true, add: true, edit: true, del: false },
  { id: "9", name: "Sistem Ayarları", view: true, add: true, edit: true, del: false },
  { id: "10", name: "Birim Tanımları", view: true, add: true, edit: true, del: false },
  { id: "11", name: "Evrak Tipleri", view: true, add: true, edit: true, del: false },
  { id: "12", name: "FTP Tanımları", view: true, add: true, edit: true, del: false },
  { id: "13", name: "Dosya Alan Tanımları", view: true, add: true, edit: true, del: false },
  { id: "14", name: "Etiketler", view: true, add: true, edit: true, del: false },
  { id: "15", name: "Komisyon Üyeleri", view: true, add: true, edit: true, del: false },
  { id: "16", name: "Evraktan Arama", view: true, add: true, edit: true, del: false },
  { id: "17", name: "Dosyadan Arama", view: true, add: true, edit: true, del: false },
  { id: "18", name: "İçerikten Arama", view: true, add: true, edit: true, del: false },
  { id: "19", name: "Yükleme Dosyalar", view: true, add: true, edit: true, del: false },
  { id: "20", name: "Dosya İndeksi", view: true, add: true, edit: true, del: false },
  { id: "21", name: "Kalite Kontrol", view: true, add: true, edit: true, del: false },
  { id: "22", name: "Ödünç Sistemi", view: true, add: true, edit: true, del: false },
];

export type LabelTemplateItem = {
  id: string;
  order: number;
  name: string;
  size: string;
  printerType: string;
  paperType: string;
  countPerPage: string;
  series: string;
  templateHtml: string;
};

const DEFAULT_LABEL_TEMPLATES: LabelTemplateItem[] = [
  {
    id: "1",
    order: 1,
    name: "Klasör Sırtlık",
    size: "5",
    printerType: "Ölçülü Tasarım",
    paperType: "A4",
    countPerPage: "5",
    series: "Genel Arşiv",
    templateHtml: "<div style='border:2px solid #000; padding:10px; text-align:center;'><h3>T.C. MALATYA BÜYÜKŞEHİR BELEDİYESİ</h3><hr/><p><strong>{KURUM_ADI}</strong></p><p>Yıl: {DOSYA_YILI} | SDP: {SDP_KODU}</p><div style='font-family:monospace; font-size:18px;'>* {BARKOD} *</div><p>Konum: {RAF_NO} / {KUTU_NO}</p></div>",
  },
  {
    id: "2",
    order: 2,
    name: "1x2.5 Minik Etiket",
    size: "1",
    printerType: "Termal Barkod Yazıcı",
    paperType: "Ölçü Göreceğim",
    countPerPage: "1",
    series: "Genel Arşiv",
    templateHtml: "<div style='text-align:center;'><strong>MBB ARŞİV</strong><br/>{BARKOD}</div>",
  },
  {
    id: "3",
    order: 3,
    name: "8x10 Dosya Etiketi",
    size: "8x10",
    printerType: "Ölçülü Tasarım",
    paperType: "A4",
    countPerPage: "4",
    series: "İhale Dosyası",
    templateHtml: "<div style='border:1px solid #333; padding:8px;'><strong>{KURUM_ADI}</strong><br/>{KONU}<br/>Barkod: {BARKOD}</div>",
  },
  {
    id: "4",
    order: 4,
    name: "İK 6x10",
    size: "5",
    printerType: "Ölçülü Tasarım",
    paperType: "A4",
    countPerPage: "6",
    series: "Personel Özlük",
    templateHtml: "<div style='border:1px solid #333; padding:8px;'><strong>PERSONEL ÖZLÜK DOSYASI</strong><br/>Sicil: {SICIL_NO}<br/>Ad: {ADI_SOYADI}</div>",
  },
  {
    id: "5",
    order: 5,
    name: "KLASÖR ETİKETİ",
    size: "0",
    printerType: "A4 Lazer",
    paperType: "A4",
    countPerPage: "8",
    series: "Genel Arşiv",
    templateHtml: "<div style='border:1px solid #333; padding:8px;'><strong>ARŞİV KLASÖRÜ</strong><br/>{BARKOD}</div>",
  },
];

export function DefinitionsManagerView({
  initialPlans,
  initialTree,
  activeMainTab = "genel",
}: {
  initialPlans: FilePlanListItem[];
  initialTree: FilePlanTree | null;
  activeMainTab?: string;
}) {
  // Ana Menü Sekmesi: genel | kullanicilar | ssdp | ayarlar
  const [mainTab, setMainTab] = useState(activeMainTab);

  // Genel Tanımlamalar Alt Sekmesi (Screenshot 2: 11 Sekme)
  const [subTab, setSubTab] = useState<
    | "birimler"
    | "ftp"
    | "seriler"
    | "alanlar"
    | "belge-turleri"
    | "listeler"
    | "ust-evrak"
    | "komisyonlar"
    | "diller"
    | "odalar"
    | "raporlar"
  >("birimler");

  // Birimler State
  const [units, setUnits] = useState<UnitItem[]>(DEFAULT_UNITS);
  const [unitSearch, setUnitSearch] = useState("");
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
  const [unitParent, setUnitParent] = useState("Ana Birim");
  const [unitName, setUnitName] = useState("");
  const [unitShortName, setUnitShortName] = useState("");
  const [unitCode, setUnitCode] = useState("");

  // FTP State
  const [ftps, setFtps] = useState<FtpItem[]>(DEFAULT_FTPS);
  const [isFtpModalOpen, setIsFtpModalOpen] = useState(false);
  const [editingFtp, setEditingFtp] = useState<FtpItem | null>(null);
  const [ftpName, setFtpName] = useState("DijitalArsivFTP");
  const [ftpServer, setFtpServer] = useState("192.168.1.177");
  const [ftpType, setFtpType] = useState("FTP");
  const [ftpUsername, setFtpUsername] = useState("mbb_rootftp");
  const [ftpPassword, setFtpPassword] = useState("");
  const [ftpPort, setFtpPort] = useState(21);
  const [ftpSsl, setFtpSsl] = useState(false);

  // Seri Tanımları State (Screenshot 1: 22 Seri)
  const [seriesList, setSeriesList] = useState<SeriesItem[]>(DEFAULT_SERIES_LIST);
  const [seriesSearch, setSeriesSearch] = useState("");
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [newSeriesCode, setNewSeriesCode] = useState("");
  const [newSeriesUnit, setNewSeriesUnit] = useState("GENEL YÖNETİM İŞLERİ");
  const [newSeriesTopic, setNewSeriesTopic] = useState("");

  // Kullanıcı ve Rol Tanımları State (Screenshot 2 & 3)
  const [userSubTab, setUserSubTab] = useState<"kullanicilar" | "roller" | "komisyon">("kullanicilar");
  const [usersList, setUsersList] = useState<SystemUser[]>(DEFAULT_USERS_LIST);
  const [userSearch, setUserSearch] = useState("");
  const [rolesList, setRolesList] = useState<SystemRole[]>(DEFAULT_ROLES_LIST);
  const [roleSearch, setRoleSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<SystemRole>(DEFAULT_ROLES_LIST[0]);
  // SSDP ve Etiket Tanımları State (Screenshot Paritesi)
  const [ssdpSubTab, setSsdpSubTab] = useState<"kodlar" | "tipler" | "etiketler">("etiketler");
  const [labelTemplates, setLabelTemplates] = useState<LabelTemplateItem[]>(DEFAULT_LABEL_TEMPLATES);
  const [labelSearch, setLabelSearch] = useState("");
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isLabelPreviewOpen, setIsLabelPreviewOpen] = useState(false);
  const [activePreviewTemplate, setActivePreviewTemplate] = useState<LabelTemplateItem | null>(null);

  // Etiket Tasarlama Form State
  const [editLabelName, setEditLabelName] = useState("Klasör Sırtlık");
  const [editPrinterType, setEditPrinterType] = useState("Ölçülü Tasarım");
  const [editPaperType, setEditPaperType] = useState("A4");
  const [editLabelWidth, setEditLabelWidth] = useState("5");
  const [editSeries, setEditSeries] = useState("Genel Arşiv");
  const [editTemplateHtml, setEditTemplateHtml] = useState(
    "<div style='border:2px solid #000; padding:12px; text-align:center; font-family:sans-serif;'>\n  <h4 style='margin:0 0 6px 0; font-size:14px;'>T.C. MALATYA BÜYÜKŞEHİR BELEDİYESİ</h4>\n  <div style='font-size:11px; color:#555;'>YAZI İŞLERİ VE ARŞİV ŞUBE MÜDÜRLÜĞÜ</div>\n  <hr style='margin:8px 0; border:0; border-top:1px solid #000;'/>\n  <div style='font-weight:bold; font-size:13px;'>{KURUM_ADI}</div>\n  <div style='font-size:11px; margin-top:4px;'>Konu: {KONU}</div>\n  <div style='font-size:11px;'>Yıl: {DOSYA_YILI} · SDP: {SDP_KODU}</div>\n  <div style='margin-top:10px; font-family:monospace; font-size:18px; font-weight:bold; letter-spacing:2px;'>||| | |||| ||| |||||</div>\n  <div style='font-family:monospace; font-size:13px; font-weight:bold;'>{BARKOD}</div>\n  <div style='font-size:10px; margin-top:6px; color:#444;'>Konum: {RAF_NO} / {KUTU_NO}</div>\n</div>"
  );

  const [permissions, setPermissions] = useState<PermissionRow[]>(DEFAULT_PERMISSIONS);

  // Arama filtreli birimler
  const filteredUnits = useMemo(() => {
    if (!unitSearch.trim()) return units;
    const q = unitSearch.toLowerCase();
    return units.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.parentName && u.parentName.toLowerCase().includes(q)) ||
        (u.shortName && u.shortName.toLowerCase().includes(q)) ||
        (u.code && u.code.includes(q))
    );
  }, [units, unitSearch]);

  // Yeni Birim Kaydet
  function handleSaveUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitName.trim()) {
      toast.error("Lütfen birim adını giriniz.");
      return;
    }

    if (editingUnit) {
      setUnits((prev) =>
        prev.map((u) =>
          u.id === editingUnit.id
            ? { ...u, name: unitName, parentName: unitParent, shortName: unitShortName, code: unitCode }
            : u
        )
      );
      toast.success(`Birim "${unitName}" güncellendi.`);
    } else {
      const newUnit: UnitItem = {
        id: `unit-${Date.now()}`,
        order: units.length + 1,
        name: unitName,
        parentName: unitParent,
        shortName: unitShortName,
        code: unitCode || `90${units.length}.01`,
      };
      setUnits((prev) => [...prev, newUnit]);
      toast.success(`Yeni birim "${unitName}" başarıyla eklendi.`);
    }

    setIsUnitModalOpen(false);
    setEditingUnit(null);
    setUnitName("");
    setUnitShortName("");
    setUnitCode("");
  }

  // Yeni FTP Kaydet
  function handleSaveFtp(e: React.FormEvent) {
    e.preventDefault();
    if (!ftpName.trim() || !ftpServer.trim()) {
      toast.error("Lütfen FTP Adı ve Sunucu adresini giriniz.");
      return;
    }

    const newFtp: FtpItem = {
      id: `ftp-${Date.now()}`,
      order: ftps.length + 1,
      name: ftpName,
      server: ftpServer,
      port: ftpPort,
      type: ftpType,
      username: ftpUsername,
      ssl: ftpSsl,
    };

    setFtps((prev) => [...prev, newFtp]);
    toast.success(`FTP sunucusu "${ftpName}" kaydedildi.`);
    setIsFtpModalOpen(false);
  }

  return (
    <div className="flex flex-col gap-4 font-sans">
      {/* 1. ÜST SEVİYE TANIMLAMALAR MENÜ SEKMELERİ (Screenshot 1 Menü Paritesi) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs">
            <Settings className="size-3.5" />
            <span>Tanımlamalar Modülü</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMainTab("genel")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                mainTab === "genel"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Genel Tanımlamalar ★
            </button>

            <button
              type="button"
              onClick={() => setMainTab("ssdp")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                mainTab === "ssdp"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              SSDP Tanımları (Dosya Planı) ★
            </button>

            <button
              type="button"
              onClick={() => setMainTab("kullanicilar")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                mainTab === "kullanicilar"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Kullanıcı ve Rol Tanımları ★
            </button>

            <button
              type="button"
              onClick={() => setMainTab("ayarlar")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                mainTab === "ayarlar"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Sistem Ayarları ★
            </button>
          </div>
        </div>
      </div>

      {/* 2. GENEL TANIMLAMALAR BÖLÜMÜ (Screenshot 2: 11 Sekmeli Tasarım) */}
      {mainTab === "genel" && (
        <div className="flex flex-col gap-3">
          {/* Breadcrumb (Screenshot 2: # Genel Tanımlamalar > Sekme Adı) */}
          <div className="flex items-center gap-1 text-xs font-semibold">
            <span className="rounded bg-sky-600 text-white px-2 py-0.5 text-[11px] font-mono">
              # Genel Tanımlamalar
            </span>
            <span className="rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[11px] capitalize font-mono">
              {subTab === "birimler" ? "Birimler" : subTab === "ftp" ? "FTP Tanımlama" : subTab === "seriler" ? "Seri Tanımlama" : subTab}
            </span>
          </div>

          {/* 11 ALT SEKME ÇUBUĞU (Screenshot 2 & 4 Birebir Paritesi) */}
          <div className="flex flex-wrap items-center gap-1 border-b border-border pb-1 overflow-x-auto">
            {[
              { id: "birimler", label: "Birimler" },
              { id: "ftp", label: "FTP Ayarları" },
              { id: "seriler", label: "Dosya Serileri" },
              { id: "alanlar", label: "Dosya Alanları" },
              { id: "belge-turleri", label: "Belge Türleri" },
              { id: "listeler", label: "Listeler" },
              { id: "ust-evrak", label: "Üst Evrak Tipleri" },
              { id: "komisyonlar", label: "Komisyonlar" },
              { id: "diller", label: "Çoklu Diller" },
              { id: "odalar", label: "Arşiv Odaları" },
              { id: "raporlar", label: "Esnek Raporlar" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id as any)}
                className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${
                  subTab === t.id
                    ? "bg-[#f59e0b] text-white shadow-xs font-black"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* SEKME 1: BİRİMLER (Screenshot 2 Birebir Tablo ve Araç Çubuğu) */}
          {subTab === "birimler" && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
              {/* Araç Çubuğu */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    Arama:
                  </span>
                  <Input
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    placeholder="Arama için değer giriniz!!"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingUnit(null);
                      setUnitName("");
                      setUnitShortName("");
                      setUnitCode("");
                      setIsUnitModalOpen(true);
                    }}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-8 text-xs gap-1"
                  >
                    <Plus className="size-3.5" />
                    <span>Yeni Birim</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success("Birim listesi Excel (xlsx) olarak indirildi.")}
                    className="gap-1 h-8 text-xs font-semibold text-emerald-600 border-emerald-300 dark:border-emerald-800"
                  >
                    <FileSpreadsheet className="size-3.5" />
                    <span>Listeyi Dışa Aktar(xlsx)</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success("Birim listesi CSV olarak indirildi.")}
                    className="gap-1 h-8 text-xs font-semibold text-blue-600 border-blue-300 dark:border-blue-800"
                  >
                    <FileText className="size-3.5" />
                    <span>Listeyi Dışa Aktar(csv)</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => toast.success("Birim hiyerarşik sıralaması kaydedildi.")}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-8 text-xs gap-1 ml-2"
                  >
                    <Save className="size-3.5" />
                    <span>Sırayı Kaydet</span>
                  </Button>
                </div>
              </div>

              {/* Birimler Tablosu (Screenshot 2 Paritesi) */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/70 text-foreground font-bold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">S.</th>
                      <th className="py-2.5 px-3">BİRİM ADI</th>
                      <th className="py-2.5 px-3">ÜST BİRİMİ</th>
                      <th className="py-2.5 px-3 w-28 text-center">İŞLEMLER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUnits.map((unit) => (
                      <tr key={unit.id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">
                          {unit.order}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <Building2 className="size-3.5 text-sky-500 shrink-0" />
                            <span>{unit.name}</span>
                            {unit.code && (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {unit.code}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                          {unit.parentName || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Düzenle Butonu (Screenshot 2: turuncu kalem ikonu) */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingUnit(unit);
                                setUnitName(unit.name);
                                setUnitParent(unit.parentName || "Ana Birim");
                                setUnitShortName(unit.shortName || "");
                                setUnitCode(unit.code || "");
                                setIsUnitModalOpen(true);
                              }}
                              className="size-7 rounded-full flex items-center justify-center border border-amber-300 bg-amber-50 dark:bg-amber-950 text-amber-600 hover:bg-amber-100 transition-colors"
                              title="Birim Düzenle"
                            >
                              <Edit3 className="size-3.5" />
                            </button>

                            {/* Sil Butonu (Screenshot 2: kırmızı çarpı ikonu) */}
                            <button
                              type="button"
                              onClick={() => {
                                setUnits((prev) => prev.filter((u) => u.id !== unit.id));
                                toast.success(`Birim "${unit.name}" silindi.`);
                              }}
                              className="size-7 rounded-full flex items-center justify-center border border-red-300 bg-red-50 dark:bg-red-950 text-red-600 hover:bg-red-100 transition-colors"
                              title="Birimi Sil"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEKME 2: FTP AYARLARI (Screenshot 4 Birebir Tablo ve Araç Çubuğu) */}
          {subTab === "ftp" && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <Button
                  size="sm"
                  onClick={() => setIsFtpModalOpen(true)}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-8 text-xs gap-1"
                >
                  <Plus className="size-3.5" />
                  <span>Yeni FTP</span>
                </Button>

                <span className="text-xs text-muted-foreground">
                  TS 13298 gereği dijital arşiv ve yedekleme FTP/SFTP entegrasyonu
                </span>
              </div>

              {/* FTP Tablosu (Screenshot 4 Paritesi) */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/70 text-foreground font-bold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">S.</th>
                      <th className="py-2.5 px-3">FTP ADI</th>
                      <th className="py-2.5 px-3">FTP SERVER</th>
                      <th className="py-2.5 px-3 w-28 text-center">FTP PORT</th>
                      <th className="py-2.5 px-3 w-28 text-center">İŞLEMLER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ftps.map((ftp) => (
                      <tr key={ftp.id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">
                          {ftp.order}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <Server className="size-3.5 text-primary shrink-0" />
                            <span>{ftp.name}</span>
                            {ftp.ssl && (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                                SSL
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">
                          {ftp.server}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {ftp.port}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toast.info(`FTP "${ftp.name}" düzenleme modunda.`)}
                              className="size-7 rounded-full flex items-center justify-center border border-amber-300 bg-amber-50 dark:bg-amber-950 text-amber-600 hover:bg-amber-100 transition-colors"
                              title="FTP Düzenle"
                            >
                              <Edit3 className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFtps((prev) => prev.filter((f) => f.id !== ftp.id));
                                toast.success(`FTP "${ftp.name}" silindi.`);
                              }}
                              className="size-7 rounded-full flex items-center justify-center border border-red-300 bg-red-50 dark:bg-red-950 text-red-600 hover:bg-red-100 transition-colors"
                              title="FTP Sil"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SEKME 3: DOSYA SERİLERİ (Screenshot 1 Birebir Paritesi - 22 Seri) */}
          {subTab === "seriler" && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
              {/* Üst Breadcrumb */}
              <div className="flex items-center gap-1 text-xs font-semibold">
                <span className="rounded bg-sky-600 text-white px-2 py-0.5 text-[11px] font-mono">
                  # Genel Tanımlamalar
                </span>
                <span className="rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[11px] font-mono">
                  Seri Tanımlama
                </span>
              </div>

              {/* Araç Çubuğu */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                    Arama:
                  </span>
                  <Input
                    value={seriesSearch}
                    onChange={(e) => setSeriesSearch(e.target.value)}
                    placeholder="Arama için değer giriniz!!"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => setIsSeriesModalOpen(true)}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-8 text-xs gap-1"
                  >
                    <Plus className="size-3.5" />
                    <span>Yeni Seri</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success("Seri listesi Excel (xlsx) olarak indirildi.")}
                    className="gap-1 h-8 text-xs font-semibold text-emerald-600 border-emerald-300"
                  >
                    <FileSpreadsheet className="size-3.5" />
                    <span>Listeyi Dışa Aktar(xlsx)</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success("Seri listesi CSV olarak indirildi.")}
                    className="gap-1 h-8 text-xs font-semibold text-blue-600 border-blue-300"
                  >
                    <FileText className="size-3.5" />
                    <span>Listeyi Dışa Aktar(csv)</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => toast.success("Seri sıralaması kaydedildi.")}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-8 text-xs gap-1 ml-2"
                  >
                    <Save className="size-3.5" />
                    <span>Sırayı Kaydet</span>
                  </Button>
                </div>
              </div>

              {/* Dosya Serileri Tablosu */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/70 text-foreground font-bold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">S.</th>
                      <th className="py-2.5 px-3">SERİ ADI</th>
                      <th className="py-2.5 px-3 w-24">SERİ KODU</th>
                      <th className="py-2.5 px-3">BAĞLI OLDUĞU BİRİM</th>
                      <th className="py-2.5 px-3">KONU ADI</th>
                      <th className="py-2.5 px-3 w-12 text-center">BSS</th>
                      <th className="py-2.5 px-3 w-12 text-center">KSS</th>
                      <th className="py-2.5 px-3 w-14 text-center">OCR</th>
                      <th className="py-2.5 px-3 w-28 text-center">İŞLEMLER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {seriesList
                      .filter(
                        (s) =>
                          !seriesSearch ||
                          s.name.toLowerCase().includes(seriesSearch.toLowerCase()) ||
                          s.code.toLowerCase().includes(seriesSearch.toLowerCase()) ||
                          s.unit.toLowerCase().includes(seriesSearch.toLowerCase())
                      )
                      .map((seri) => (
                        <tr key={seri.id} className="hover:bg-muted/50 transition-colors">
                          <td className="py-2 px-3 text-center font-mono text-muted-foreground">{seri.order}</td>
                          <td className="py-2 px-3 font-semibold text-foreground">{seri.name}</td>
                          <td className="py-2 px-3 font-mono font-bold text-sky-600">{seri.code}</td>
                          <td className="py-2 px-3 text-muted-foreground truncate max-w-xs">{seri.unit}</td>
                          <td className="py-2 px-3 text-muted-foreground truncate max-w-xs">{seri.topic}</td>
                          <td className="py-2 px-3 text-center font-mono">{seri.bss}</td>
                          <td className="py-2 px-3 text-center font-mono">{seri.kss}</td>
                          <td className="py-2 px-3 text-center font-semibold text-muted-foreground">{seri.ocr}</td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSeriesList((prev) =>
                                    prev.map((s) => (s.id === seri.id ? { ...s, active: !s.active } : s))
                                  );
                                }}
                                className={`size-6 rounded-full flex items-center justify-center border transition-colors ${
                                  seri.active
                                    ? "border-sky-400 bg-sky-50 text-sky-600"
                                    : "border-muted bg-muted text-muted-foreground"
                                }`}
                                title="Durum"
                              >
                                <Check className="size-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => toast.info(`Seri ${seri.name} düzenleniyor.`)}
                                className="size-6 rounded-full flex items-center justify-center border border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100"
                                title="Düzenle"
                              >
                                <Edit3 className="size-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSeriesList((prev) => prev.filter((s) => s.id !== seri.id));
                                  toast.success(`Seri ${seri.name} silindi.`);
                                }}
                                className="size-6 rounded-full flex items-center justify-center border border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                                title="Sil"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DİĞER SEKMELER (Belge Türleri, Odalar vb.) */}
          {subTab === "belge-turleri" && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="font-bold text-foreground">Belge & Evrak Türleri</h4>
                <Button size="sm" onClick={() => toast.info("Yeni belge türü sihirbazı.")} className="h-7 text-xs">
                  <Plus className="size-3" /> Yeni Belge Türü
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                {[
                  "Sözleşmeler",
                  "Birim Fiyat Teklifi",
                  "Gizlilik Sözleşmesi",
                  "Fatura",
                  "Dilekçe - Talep Yazısı",
                  "İhale Kararı ve Onay Belgesi",
                  "Özlük Dosyası",
                  "Kimlik Belgesi / Pasaport",
                ].map((tur) => (
                  <div key={tur} className="rounded-lg border border-border p-2.5 flex items-center justify-between bg-muted/20">
                    <span className="font-semibold text-foreground">{tur}</span>
                    <Edit3 className="size-3.5 text-muted-foreground cursor-pointer hover:text-primary" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {subTab === "odalar" && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="font-bold text-foreground">Arşiv Odaları & Depolar</h4>
                <Button size="sm" onClick={() => toast.info("Yeni arşiv odası ekle.")} className="h-7 text-xs">
                  <Plus className="size-3" /> Yeni Oda
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: "Malatya Merkez Kurum Arşivi (Kat -1)", cap: "12.000 Kutu", type: "Raylı Kompakt" },
                  { name: "1. Bodrum Raylı Dolap Odası", cap: "8.500 Kutu", type: "Kompakt Dolap" },
                  { name: "Zemin Kat Hukuk Arşiv Deposu", cap: "4.200 Kutu", type: "Sabit Raf" },
                  { name: "2. Kat Dijitalleştirme ve Tasnif Odası", cap: "2.000 Kutu", type: "Geçici Raf" },
                ].map((oda) => (
                  <div key={oda.name} className="rounded-lg border border-border p-3 flex flex-col gap-1 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{oda.name}</span>
                      <Badge variant="outline" className="text-[10px]">{oda.type}</Badge>
                    </div>
                    <span className="text-muted-foreground text-[11px]">Kapasite: {oda.cap}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {["alanlar", "listeler", "ust-evrak", "komisyonlar", "diller", "raporlar"].includes(subTab) && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
              <p className="font-bold text-foreground capitalize">{subTab} Yapılandırması Hazır</p>
              <p className="mt-1">Bu alt modüle ait kurumsal arşiv standart şablon parametreleri yüklenmiştir.</p>
            </div>
          )}
        </div>
      )}

      {/* 3. SSDP TANIMLARI (Screenshot Paritesi: SDP Kod, SDP Tip, Etiketler SDP Tanımları) */}
      {mainTab === "ssdp" && (
        <div className="flex flex-col gap-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs font-semibold">
            <span className="rounded bg-sky-600 text-white px-2 py-0.5 text-[11px] font-mono">
              # Sdp Tanımlamaları
            </span>
            <span className="rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[11px] font-mono capitalize">
              {ssdpSubTab === "kodlar" ? "SDP Kod Tanımları" : ssdpSubTab === "tipler" ? "SDP Tip Tanımları" : "Etiketler Sdp Tanımları"}
            </span>
          </div>

          {/* 3 Alt Sekme: SDP Kod Tanımları | SDP Tip Tanımları | Etiketler SDP Tanımları */}
          <div className="flex items-center gap-1 border-b border-border pb-1">
            <button
              type="button"
              onClick={() => setSsdpSubTab("kodlar")}
              className={`px-4 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${
                ssdpSubTab === "kodlar"
                  ? "bg-[#0284c7] text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              SDP Kod Tanımları
            </button>
            <button
              type="button"
              onClick={() => setSsdpSubTab("tipler")}
              className={`px-4 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${
                ssdpSubTab === "tipler"
                  ? "bg-[#0284c7] text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              SDP Tip Tanımları
            </button>
            <button
              type="button"
              onClick={() => setSsdpSubTab("etiketler")}
              className={`px-4 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${
                ssdpSubTab === "etiketler"
                  ? "bg-[#f59e0b] text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Etiketler SDP Tanımları
            </button>
          </div>

          {/* SUB-TAB 1: SDP KOD TANIMLARI */}
          {ssdpSubTab === "kodlar" && (
            <div className="flex flex-col gap-2">
              <FilePlanManager initialPlans={initialPlans} initialTree={initialTree} />
            </div>
          )}

          {/* SUB-TAB 2: SDP TİP TANIMLARI */}
          {ssdpSubTab === "tipler" && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="font-bold text-foreground">SDP Evrak & Dosya Tipleri</h4>
                <Button size="sm" onClick={() => toast.info("Yeni SDP tipi ekle")} className="h-7 text-xs">
                  <Plus className="size-3" /> Yeni Tip
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { tip: "İhale İşlem Dosyası", code: "755.02", bss: "10 Yıl", kss: "Süresiz" },
                  { tip: "Gelen - Giden Yazı", code: "805.01", bss: "5 Yıl", kss: "15 Yıl" },
                  { tip: "Meclis ve Encümen Kararları", code: "050.01", bss: "Süresiz", kss: "Devlet Arşivi" },
                  { tip: "Personel Özlük Dosyası", code: "903.07", bss: "100 Yıl", kss: "Süresiz" },
                  { tip: "Taşınmaz Mal Kayıtları", code: "756.01", bss: "Süresiz", kss: "Süresiz" },
                ].map((t) => (
                  <div key={t.tip} className="rounded-lg border border-border p-3 flex flex-col gap-1 bg-muted/20">
                    <span className="font-bold text-foreground">{t.tip}</span>
                    <span className="font-mono text-primary text-[11px]">Kod: {t.code}</span>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                      <span>BSS: {t.bss}</span>
                      <span>KSS: {t.kss}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB 3: ETİKETLER SDP TANIMLARI (Screenshot Birebir Paritesi) */}
          {ssdpSubTab === "etiketler" && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
              {/* Araç Çubuğu */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <Button
                  size="sm"
                  onClick={() => setIsLabelModalOpen(true)}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-8 text-xs gap-1"
                >
                  <Plus className="size-3.5" />
                  <span>Yeni Etiket Tasarla</span>
                </Button>

                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Arama:</span>
                  <Input
                    value={labelSearch}
                    onChange={(e) => setLabelSearch(e.target.value)}
                    placeholder="Arama için değer giriniz!!"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Etiket Şablonları Tablosu (Screenshot Kolonları) */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/70 text-foreground font-bold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">S.</th>
                      <th className="py-2.5 px-3">ETİKET ADI</th>
                      <th className="py-2.5 px-3 w-32 text-center">ETİKET ÖLÇÜSÜ</th>
                      <th className="py-2.5 px-3 w-28 text-center">İŞLEMLER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {labelTemplates
                      .filter((l) => !labelSearch || l.name.toLowerCase().includes(labelSearch.toLowerCase()))
                      .map((template) => (
                        <tr key={template.id} className="hover:bg-muted/50 transition-colors">
                          <td className="py-2 px-3 text-center font-mono text-muted-foreground">{template.order}</td>
                          <td className="py-2 px-3 font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              <FileText className="size-3.5 text-primary shrink-0" />
                              <span>{template.name}</span>
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                {template.printerType}
                              </Badge>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-foreground">
                            {template.size}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Önizleme / Yazdır Butonu (Screenshot: Kağıt ikonu) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePreviewTemplate(template);
                                  setIsLabelPreviewOpen(true);
                                }}
                                className="size-7 rounded-full flex items-center justify-center border border-sky-300 bg-sky-50 dark:bg-sky-950 text-sky-600 hover:bg-sky-100 transition-colors"
                                title="Baskı Önizleme"
                              >
                                <Printer className="size-3.5" />
                              </button>

                              {/* Düzenle Butonu (Screenshot: Turuncu kalem) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditLabelName(template.name);
                                  setEditPrinterType(template.printerType);
                                  setEditPaperType(template.paperType);
                                  setEditLabelWidth(template.size);
                                  setEditSeries(template.series);
                                  setEditTemplateHtml(template.templateHtml);
                                  setIsLabelModalOpen(true);
                                }}
                                className="size-7 rounded-full flex items-center justify-center border border-amber-300 bg-amber-50 dark:bg-amber-950 text-amber-600 hover:bg-amber-100 transition-colors"
                                title="Şablonu Düzenle"
                              >
                                <Edit3 className="size-3.5" />
                              </button>

                              {/* Sil Butonu (Screenshot: Kırmızı çarpı) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setLabelTemplates((prev) => prev.filter((item) => item.id !== template.id));
                                  toast.success(`Etiket şablonu "${template.name}" silindi.`);
                                }}
                                className="size-7 rounded-full flex items-center justify-center border border-red-300 bg-red-50 dark:bg-red-950 text-red-600 hover:bg-red-100 transition-colors"
                                title="Şablonu Sil"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. KULLANICI VE ROL TANIMLARI (Screenshot 2 & 3 Birebir Paritesi) */}
      {mainTab === "kullanicilar" && (
        <div className="flex flex-col gap-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs font-semibold">
            <span className="rounded bg-sky-600 text-white px-2 py-0.5 text-[11px] font-mono">
              # Kullanıcı/Rol Tanımlamaları
            </span>
            <span className="rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[11px] font-mono capitalize">
              {userSubTab === "kullanicilar" ? "Kullanıcı Tanımları" : userSubTab === "roller" ? "Rol Tanımları" : "Komisyon Üyeleri"}
            </span>
          </div>

          {/* 3 Alt Sekme: Kullanıcı Tanımları | Rol Tanımları | Komisyon Üyeleri */}
          <div className="flex items-center gap-1 border-b border-border pb-1">
            <button
              type="button"
              onClick={() => setUserSubTab("kullanicilar")}
              className={`px-4 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${
                userSubTab === "kullanicilar"
                  ? "bg-[#f59e0b] text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Kullanıcı Tanımları
            </button>
            <button
              type="button"
              onClick={() => setUserSubTab("roller")}
              className={`px-4 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${
                userSubTab === "roller"
                  ? "bg-[#0284c7] text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Rol Tanımları
            </button>
            <button
              type="button"
              onClick={() => setUserSubTab("komisyon")}
              className={`px-4 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${
                userSubTab === "komisyon"
                  ? "bg-[#f59e0b] text-white shadow-xs"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Komisyon Üyeleri
            </button>
          </div>

          {/* ALT SEKME 1: KULLANICI TANIMLARI TABLOSU (Screenshot 2) */}
          {userSubTab === "kullanicilar" && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3">
              {/* Araç Çubuğu */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => toast.info("Yeni kullanıcı formu açıldı.")}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-bold h-8 text-xs gap-1"
                  >
                    <Plus className="size-3.5" />
                    <span>Yeni Kullanıcı</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Active Directory kullanıcıları senkronize ediliyor...")}
                    className="gap-1 h-8 text-xs font-semibold"
                  >
                    <Users className="size-3.5" />
                    <span>Active Directory Listesi</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("Excel yükleme penceresi açıldı.")}
                    className="gap-1 h-8 text-xs font-semibold"
                  >
                    <FileSpreadsheet className="size-3.5" />
                    <span>Excelden Kullanıcı Alma</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success("Kullanıcı listesi Excel olarak indirildi.")}
                    className="gap-1 h-8 text-xs font-semibold text-emerald-600"
                  >
                    <FileSpreadsheet className="size-3.5" />
                    <span>Listeyi Dışa Aktar(xlsx)</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success("Kullanıcı listesi CSV olarak indirildi.")}
                    className="gap-1 h-8 text-xs font-semibold text-blue-600"
                  >
                    <FileText className="size-3.5" />
                    <span>Listeyi Dışa Aktar(csv)</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Arama:</span>
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Arama için değer giriniz!!"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Kullanıcılar Tablosu */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/70 text-foreground font-bold border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">S.</th>
                      <th className="py-2.5 px-3">KULLANICI ADI</th>
                      <th className="py-2.5 px-3">ADI</th>
                      <th className="py-2.5 px-3">SOYADI</th>
                      <th className="py-2.5 px-3">YETKİ</th>
                      <th className="py-2.5 px-3 w-20 text-center">DURUM</th>
                      <th className="py-2.5 px-3 w-24 text-center">İŞLEMLER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usersList
                      .filter(
                        (u) =>
                          !userSearch ||
                          u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.firstName.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.lastName.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.role.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                          <td className="py-2 px-3 text-center font-mono text-muted-foreground">{u.order}</td>
                          <td className="py-2 px-3 font-mono font-bold text-sky-600">{u.username}</td>
                          <td className="py-2 px-3 font-semibold text-foreground">{u.firstName}</td>
                          <td className="py-2 px-3 font-semibold text-foreground">{u.lastName}</td>
                          <td className="py-2 px-3 text-muted-foreground">{u.role}</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === "Aktif"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                  : "bg-red-500/10 text-red-700 dark:text-red-400"
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => toast.info(`Kullanıcı ${u.username} düzenleniyor.`)}
                                className="size-6 rounded-full flex items-center justify-center border border-amber-300 bg-amber-50 text-amber-600 hover:bg-amber-100"
                                title="Düzenle"
                              >
                                <Edit3 className="size-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUsersList((prev) => prev.filter((item) => item.id !== u.id));
                                  toast.success(`Kullanıcı ${u.username} silindi.`);
                                }}
                                className="size-6 rounded-full flex items-center justify-center border border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                                title="Sil"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ALT SEKME 2: ROL TANIMLARI & YETKİ MATRİSİ (Screenshot 3 Split Screen) */}
          {userSubTab === "roller" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* SOL PANEL: ROLLER LİSTESİ */}
              <div className="lg:col-span-5 rounded-xl border border-border bg-card p-3 shadow-xs flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border pb-2">
                  <span className="font-bold text-foreground text-xs">Roller (Yetkiler)</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => toast.info("Yeni rol oluşturma penceresi devrede.")}
                      className="h-7 text-xs bg-sky-600 text-white font-bold"
                    >
                      <Plus className="size-3" /> Yeni Rol
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Input
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    placeholder="Arama için değer giriniz!!"
                    className="h-7 text-xs"
                  />
                </div>

                <div className="overflow-x-auto rounded-lg border border-border max-h-[580px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/70 text-foreground font-bold border-b border-border sticky top-0">
                      <tr>
                        <th className="py-2 px-2 w-8 text-center">S.</th>
                        <th className="py-2 px-2">YETKİ ADI</th>
                        <th className="py-2 px-2 w-32 text-center">İŞLEMLER</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rolesList
                        .filter((r) => !roleSearch || r.name.toLowerCase().includes(roleSearch.toLowerCase()))
                        .map((r) => {
                          const isSelected = selectedRole.id === r.id;
                          return (
                            <tr
                              key={r.id}
                              onClick={() => setSelectedRole(r)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? "bg-sky-500/10 font-bold" : "hover:bg-muted/40"
                              }`}
                            >
                              <td className="py-1.5 px-2 text-center font-mono text-[11px] text-muted-foreground">
                                {r.order}
                              </td>
                              <td className="py-1.5 px-2 text-foreground truncate max-w-[140px]">
                                {r.name}
                              </td>
                              <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => toast.success(`Rol ${r.name} kopyalandı.`)}
                                    className="size-5 rounded border border-border bg-background hover:bg-muted text-muted-foreground flex items-center justify-center text-[10px]"
                                    title="Kopyala"
                                  >
                                    📑
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toast.info(`Rol ${r.name} serileri.`)}
                                    className="size-5 rounded border border-border bg-background hover:bg-muted text-muted-foreground flex items-center justify-center text-[10px]"
                                    title="Seri"
                                  >
                                    📁
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedRole(r)}
                                    className="size-5 rounded border border-sky-400 bg-sky-50 text-sky-600 flex items-center justify-center text-[10px]"
                                    title="Seç"
                                  >
                                    ☑️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toast.info(`Rol ${r.name} düzenleniyor.`)}
                                    className="size-5 rounded border border-amber-300 bg-amber-50 text-amber-600 flex items-center justify-center text-[10px]"
                                    title="Düzenle"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRolesList((prev) => prev.filter((item) => item.id !== r.id));
                                      toast.success(`Rol ${r.name} silindi.`);
                                    }}
                                    className="size-5 rounded border border-red-300 bg-red-50 text-red-600 flex items-center justify-center text-[10px]"
                                    title="Sil"
                                  >
                                    ❌
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SAĞ PANEL: ROL İZİN MATRİSİ (Screenshot 3 Matris Paritesi) */}
              <div className="lg:col-span-7 rounded-xl border border-border bg-card p-3 shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground text-xs">Rol Yetki İzin Matrisi:</span>
                    <Badge variant="outline" className="font-bold text-sky-600 border-sky-300">
                      {selectedRole.name}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => toast.success(`${selectedRole.name} için yetki matrisi kaydedildi.`)}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1"
                  >
                    <Save className="size-3" /> İzinleri Kaydet
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-border max-h-[580px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/70 text-foreground font-bold border-b border-border sticky top-0">
                      <tr>
                        <th className="py-2 px-3">YETKİ ADI (MODÜL/İŞLEM)</th>
                        <th className="py-2 px-3 w-16 text-center bg-emerald-500/10 text-emerald-700">GÖR</th>
                        <th className="py-2 px-3 w-16 text-center bg-blue-500/10 text-blue-700">EKLE</th>
                        <th className="py-2 px-3 w-16 text-center bg-amber-500/10 text-amber-700">DÜZ</th>
                        <th className="py-2 px-3 w-16 text-center bg-red-500/10 text-red-700">SİL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {permissions.map((p) => (
                        <tr key={p.id} className="hover:bg-muted/30">
                          <td className="py-1.5 px-3 font-semibold text-foreground text-[11px]">{p.name}</td>
                          {/* GÖR */}
                          <td
                            className={`py-1.5 px-3 text-center font-bold cursor-pointer transition-colors ${
                              p.view ? "bg-emerald-500/20 text-emerald-700" : "bg-red-500/10 text-red-500"
                            }`}
                            onClick={() => {
                              setPermissions((prev) =>
                                prev.map((item) => (item.id === p.id ? { ...item, view: !item.view } : item))
                              );
                            }}
                          >
                            {p.view ? "+" : "-"}
                          </td>
                          {/* EKLE */}
                          <td
                            className={`py-1.5 px-3 text-center font-bold cursor-pointer transition-colors ${
                              p.add ? "bg-emerald-500/20 text-emerald-700" : "bg-red-500/10 text-red-500"
                            }`}
                            onClick={() => {
                              setPermissions((prev) =>
                                prev.map((item) => (item.id === p.id ? { ...item, add: !item.add } : item))
                              );
                            }}
                          >
                            {p.add ? "+" : "-"}
                          </td>
                          {/* DÜZ */}
                          <td
                            className={`py-1.5 px-3 text-center font-bold cursor-pointer transition-colors ${
                              p.edit ? "bg-emerald-500/20 text-emerald-700" : "bg-red-500/10 text-red-500"
                            }`}
                            onClick={() => {
                              setPermissions((prev) =>
                                prev.map((item) => (item.id === p.id ? { ...item, edit: !item.edit } : item))
                              );
                            }}
                          >
                            {p.edit ? "+" : "-"}
                          </td>
                          {/* SİL */}
                          <td
                            className={`py-1.5 px-3 text-center font-bold cursor-pointer transition-colors ${
                              p.del ? "bg-emerald-500/20 text-emerald-700" : "bg-red-500/10 text-red-500"
                            }`}
                            onClick={() => {
                              setPermissions((prev) =>
                                prev.map((item) => (item.id === p.id ? { ...item, del: !item.del } : item))
                              );
                            }}
                          >
                            {p.del ? "+" : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ALT SEKME 3: KOMİSYON ÜYELERİ */}
          {userSubTab === "komisyon" && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-xs flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h4 className="font-bold text-foreground">Arşiv Ayıklama ve İmha Komisyonu Üyeleri</h4>
                <Button size="sm" onClick={() => toast.info("Yeni komisyon üyesi atama.")} className="h-7 text-xs font-bold">
                  <Plus className="size-3" /> Komisyon Üyesi Ekle
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { name: "Sami GÖNCÜ", role: "Komisyon Başkanı", unit: "Kurum Arşiv Yöneticisi" },
                  { name: "Ali METE", role: "Asil Üye (Raportör)", unit: "İhale ve Operasyon" },
                  { name: "Veyis AYDEMİR", role: "Asil Üye (Hukukçu)", unit: "Hukuk İşleri Müdürlüğü" },
                  { name: "Ayşen KÜYÜK", role: "Yedek Üye", unit: "Yazı İşleri ve Kararlar" },
                  { name: "Mehmet Zahid METE", role: "Yedek Üye", unit: "Mali Hizmetler Dairesi" },
                ].map((m) => (
                  <div key={m.name} className="rounded-lg border border-border p-3 flex flex-col gap-1 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{m.name}</span>
                      <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                    </div>
                    <span className="text-muted-foreground text-[11px]">{m.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. SİSTEM AYARLARI */}
      {mainTab === "ayarlar" && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col gap-4 text-xs">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <HardDrive className="size-4 text-primary" />
              Sistem Parametreleri ve Entegrasyonlar (TS 13298)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-4 flex flex-col gap-2">
              <span className="font-bold text-foreground text-xs">OCR Motoru ve Çözünürlük</span>
              <p className="text-muted-foreground text-[11px]">Tesseract OCR v5.3 devrede. 300 DPI gri tonlama ve renkli otomatik eşikleme aktif.</p>
              <Badge variant="outline" className="w-fit text-emerald-600 border-emerald-300">OCR Motoru Çalışıyor</Badge>
            </div>

            <div className="rounded-lg border border-border p-4 flex flex-col gap-2">
              <span className="font-bold text-foreground text-xs">Zaman Damgası & E-İmza</span>
              <p className="text-muted-foreground text-[11px]">5070 Sayılı Elektronik İmza Kanunu ve KamuSM Nitelikli Elektronik Sertifika doğrulama aktif.</p>
              <Badge variant="outline" className="w-fit text-blue-600 border-blue-300">KamuSM Entegre</Badge>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: BİRİM TANIMLA (Screenshot 3 Birebir Paritesi)                   */}
      {/* ========================================================================= */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Birim Tanımla</h3>
              <button
                type="button"
                onClick={() => setIsUnitModalOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Üst Birim</Label>
                <select
                  value={unitParent}
                  onChange={(e) => setUnitParent(e.target.value)}
                  className="h-8.5 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="Ana Birim">Ana Birim</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Birim Adı *</Label>
                <Input
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="Birim Adı giriniz..."
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Birim Kısa Adı</Label>
                <Input
                  value={unitShortName}
                  onChange={(e) => setUnitShortName(e.target.value)}
                  placeholder="Örn: BTD"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">İdari Birim Kimlik Kodu</Label>
                <Input
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value)}
                  placeholder="Örn: 900.04"
                />
              </div>

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
                  onClick={() => setIsUnitModalOpen(false)}
                >
                  Vazgeç
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: FTP TANIMLA (Screenshot 5 Birebir Paritesi)                     */}
      {/* ========================================================================= */}
      {isFtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">FTP Tanımla</h3>
              <button
                type="button"
                onClick={() => setIsFtpModalOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFtp} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">FTP Adı *</Label>
                <Input
                  value={ftpName}
                  onChange={(e) => setFtpName(e.target.value)}
                  placeholder="DijitalArsivFTP"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">FTP Server *</Label>
                <Input
                  value={ftpServer}
                  onChange={(e) => setFtpServer(e.target.value)}
                  placeholder="192.168.1.177"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Ftp Türü *</Label>
                <select
                  value={ftpType}
                  onChange={(e) => setFtpType(e.target.value)}
                  className="h-8.5 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="FTP">FTP</option>
                  <option value="SFTP">SFTP (Güvenli SSH Aktarımı)</option>
                  <option value="FTPS">FTPS (SSL/TLS Şifreli)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">FTP Kullanıcı *</Label>
                <Input
                  value={ftpUsername}
                  onChange={(e) => setFtpUsername(e.target.value)}
                  placeholder="mbb_rootftp"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">FTP Parola *</Label>
                <Input
                  type="password"
                  value={ftpPassword}
                  onChange={(e) => setFtpPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">FTP Port *</Label>
                <Input
                  type="number"
                  value={ftpPort}
                  onChange={(e) => setFtpPort(Number(e.target.value))}
                  placeholder="21"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ftp-ssl"
                  checked={ftpSsl}
                  onChange={(e) => setFtpSsl(e.target.checked)}
                  className="size-4 rounded border-border"
                />
                <Label htmlFor="ftp-ssl" className="font-semibold text-foreground cursor-pointer">
                  FTP Ssl
                </Label>
              </div>

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
                  onClick={() => setIsFtpModalOpen(false)}
                >
                  Vazgeç
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: YENİ SERİ TANIMLA (Screenshot 1 Birebir Paritesi)               */}
      {/* ========================================================================= */}
      {isSeriesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Yeni Seri Tanımla</h3>
              <button
                type="button"
                onClick={() => setIsSeriesModalOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newSeriesName.trim()) return;
                const newS: SeriesItem = {
                  id: `series-${Date.now()}`,
                  order: seriesList.length + 1,
                  name: newSeriesName,
                  code: newSeriesCode || "NEW",
                  unit: newSeriesUnit,
                  topic: newSeriesTopic || newSeriesName,
                  bss: 0,
                  kss: 0,
                  ocr: "Yok",
                  active: true,
                };
                setSeriesList((prev) => [...prev, newS]);
                toast.success(`Yeni seri "${newSeriesName}" kaydedildi.`);
                setIsSeriesModalOpen(false);
                setNewSeriesName("");
                setNewSeriesCode("");
                setNewSeriesTopic("");
              }}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Seri Adı *</Label>
                <Input
                  value={newSeriesName}
                  onChange={(e) => setNewSeriesName(e.target.value)}
                  placeholder="Örn: İhale Dosyası"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Seri Kodu *</Label>
                <Input
                  value={newSeriesCode}
                  onChange={(e) => setNewSeriesCode(e.target.value)}
                  placeholder="Örn: İHL"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Bağlı Olduğu Birim</Label>
                <select
                  value={newSeriesUnit}
                  onChange={(e) => setNewSeriesUnit(e.target.value)}
                  className="h-8.5 rounded-lg border border-border bg-background px-3 text-xs text-foreground"
                >
                  <option value="GENEL YÖNETİM İŞLERİ">GENEL YÖNETİM İŞLERİ</option>
                  <option value="BİLGİ TEKNOLOJİLERİ DİREKTÖRLÜĞÜ">BİLGİ TEKNOLOJİLERİ DİREKTÖRLÜĞÜ</option>
                  <option value="MALİ İŞLER DİREKTÖRLÜĞÜ">MALİ İŞLER DİREKTÖRLÜĞÜ</option>
                  <option value="İHALE VE PROJELER DİREKTÖRLÜĞÜ">İHALE VE PROJELER DİREKTÖRLÜĞÜ</option>
                  <option value="HUKUK İŞLERİ DİREKTÖRLÜĞÜ">HUKUK İŞLERİ DİREKTÖRLÜĞÜ</option>
                  <option value="İK VE EĞİTİM DİREKTÖRLÜĞÜ">İK VE EĞİTİM DİREKTÖRLÜĞÜ</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="font-semibold text-foreground">Konu Adı</Label>
                <Input
                  value={newSeriesTopic}
                  onChange={(e) => setNewSeriesTopic(e.target.value)}
                  placeholder="Örn: Arşiv Projeleri"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
                <Button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-6 h-9">
                  Kaydet
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsSeriesModalOpen(false)}>
                  Vazgeç
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 9. MODAL: ETİKET TASARLAMA (Screenshot Birebir Paritesi)                   */}
      {/* ========================================================================= */}
      {isLabelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Etiket Tasarlama</h3>
              <button
                type="button"
                onClick={() => setIsLabelModalOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const newT: LabelTemplateItem = {
                  id: `tpl-${Date.now()}`,
                  order: labelTemplates.length + 1,
                  name: editLabelName,
                  size: editLabelWidth,
                  printerType: editPrinterType,
                  paperType: editPaperType,
                  countPerPage: editLabelWidth,
                  series: editSeries,
                  templateHtml: editTemplateHtml,
                };
                setLabelTemplates((prev) => [...prev, newT]);
                toast.success(`Etiket şablonu "${editLabelName}" kaydedildi.`);
                setIsLabelModalOpen(false);
              }}
              className="flex flex-col gap-3.5"
            >
              {/* Üst Form Alanları (Screenshot Birebir) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label className="font-semibold text-foreground">Etiket Adı *</Label>
                  <Input
                    value={editLabelName}
                    onChange={(e) => setEditLabelName(e.target.value)}
                    placeholder="Örn: Klasör Sırtlık"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="font-semibold text-foreground">Yazıcı Türü</Label>
                  <select
                    value={editPrinterType}
                    onChange={(e) => setEditPrinterType(e.target.value)}
                    className="h-8.5 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="Ölçülü Tasarım">Ölçülü Tasarım</option>
                    <option value="Termal Barkod Yazıcı (Zebra/Argox)">Termal Barkod Yazıcı (Zebra/Argox)</option>
                    <option value="Lazer A4 Sayfa Yazıcı (Avery)">Lazer A4 Sayfa Yazıcı (Avery)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="font-semibold text-foreground">Kağıt Türü</Label>
                  <select
                    value={editPaperType}
                    onChange={(e) => setEditPaperType(e.target.value)}
                    className="h-8.5 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">Kağıt Türü Seçiniz...</option>
                    <option value="A5">A5</option>
                    <option value="A4">A4</option>
                    <option value="A3">A3</option>
                    <option value="Ölçü Göreceğim">Ölçü Göreceğim</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="font-semibold text-foreground">Etiket Genişliği (1 sayfadaki etiket adedi)</Label>
                  <Input
                    value={editLabelWidth}
                    onChange={(e) => setEditLabelWidth(e.target.value)}
                    placeholder="5"
                  />
                </div>

                <div className="sm:col-span-2 flex flex-col gap-1">
                  <Label className="font-semibold text-foreground">Serisi</Label>
                  <select
                    value={editSeries}
                    onChange={(e) => setEditSeries(e.target.value)}
                    className="h-8.5 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="Genel Arşiv">Genel Arşiv</option>
                    <option value="İhale Dosyası">İhale Dosyası</option>
                    <option value="Personel Özlük">Personel Özlük</option>
                    <option value="Bakım / Onarım Sözleşmeleri">Bakım / Onarım Sözleşmeleri</option>
                  </select>
                </div>
              </div>

              {/* Dinamik Değişken Ekleme Çubuğu */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-border bg-muted/30">
                <span className="font-bold text-foreground text-[11px] mr-1">Değişken Ekle:</span>
                {[
                  "{BARKOD}",
                  "{KURUM_ADI}",
                  "{DOSYA_YILI}",
                  "{SDP_KODU}",
                  "{KONU}",
                  "{RAF_NO}",
                  "{KUTU_NO}",
                  "{ADI_SOYADI}",
                ].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      setEditTemplateHtml((prev) => prev + `\n<div>${v}</div>`);
                      toast.info(`${v} şablona eklendi.`);
                    }}
                    className="px-2 py-0.5 rounded bg-background border border-border text-primary font-mono text-[10px] font-bold hover:bg-muted"
                  >
                    + {v}
                  </button>
                ))}
              </div>

              {/* WYSIWYG Araç Çubuğu (Screenshot Paritesi) */}
              <div className="rounded-lg border border-border bg-background overflow-hidden flex flex-col">
                <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-border bg-muted/40 text-[11px]">
                  <span className="px-2 py-0.5 font-bold border border-border rounded bg-background">Kaynak</span>
                  <div className="h-4 w-px bg-border mx-1" />
                  <span className="px-1.5 py-0.5 font-bold hover:bg-muted rounded cursor-pointer">B</span>
                  <span className="px-1.5 py-0.5 italic hover:bg-muted rounded cursor-pointer">I</span>
                  <span className="px-1.5 py-0.5 underline hover:bg-muted rounded cursor-pointer">U</span>
                  <span className="px-1.5 py-0.5 line-through hover:bg-muted rounded cursor-pointer">S</span>
                  <div className="h-4 w-px bg-border mx-1" />
                  <span className="px-1.5 py-0.5 hover:bg-muted rounded cursor-pointer">≡ Sol</span>
                  <span className="px-1.5 py-0.5 hover:bg-muted rounded cursor-pointer">≡ Orta</span>
                  <span className="px-1.5 py-0.5 hover:bg-muted rounded cursor-pointer">≡ Sağ</span>
                  <div className="h-4 w-px bg-border mx-1" />
                  <span className="px-1.5 py-0.5 hover:bg-muted rounded cursor-pointer">Tablo</span>
                  <span className="px-1.5 py-0.5 hover:bg-muted rounded cursor-pointer">Barkod / QR</span>
                </div>

                {/* HTML Kod & Canlı Etiket Önizleme */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  <div className="p-2">
                    <Label className="font-semibold text-muted-foreground text-[10px] mb-1 block">HTML / Şablon Kodu:</Label>
                    <textarea
                      rows={10}
                      value={editTemplateHtml}
                      onChange={(e) => setEditTemplateHtml(e.target.value)}
                      className="w-full h-56 p-2 rounded border border-border font-mono text-xs bg-background focus:outline-none"
                    />
                  </div>

                  <div className="p-2 flex flex-col justify-start items-center bg-slate-50 dark:bg-slate-900/50">
                    <Label className="font-semibold text-muted-foreground text-[10px] mb-2 self-start">Canlı Etiket Önizlemesi:</Label>
                    <div
                      className="w-full max-w-[280px] bg-white text-black p-4 rounded shadow-md border border-slate-300 text-center"
                      dangerouslySetInnerHTML={{
                        __html: editTemplateHtml
                          .replace(/{BARKOD}/g, "50.1-2024-8")
                          .replace(/{KURUM_ADI}/g, "MALATYA B.Ş. BELEDİYESİ")
                          .replace(/{DOSYA_YILI}/g, "2024")
                          .replace(/{SDP_KODU}/g, "755.02.01")
                          .replace(/{KONU}/g, "Arşiv Düzenleme İhale Dosyası")
                          .replace(/{RAF_NO}/g, "R-14")
                          .replace(/{KUTU_NO}/g, "K-08")
                          .replace(/{ADI_SOYADI}/g, "Ali METE"),
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Kaydet Butonu (Screenshot: Mavi Kaydet) */}
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
                  onClick={() => setIsLabelModalOpen(false)}
                >
                  Vazgeç
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 10. MODAL: ETİKET BASKI ÖNİZLEME (Yazdır)                                 */}
      {/* ========================================================================= */}
      {isLabelPreviewOpen && activePreviewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Etiket Baskı Önizleme</h3>
              <button
                type="button"
                onClick={() => setIsLabelPreviewOpen(false)}
                className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl flex justify-center">
              <div
                className="w-full max-w-xs bg-white text-black p-4 rounded shadow-lg border border-slate-300 text-center"
                dangerouslySetInnerHTML={{
                  __html: activePreviewTemplate.templateHtml
                    .replace(/{BARKOD}/g, "50.1-2024-8")
                    .replace(/{KURUM_ADI}/g, "MALATYA B.Ş. BELEDİYESİ")
                    .replace(/{DOSYA_YILI}/g, "2024")
                    .replace(/{SDP_KODU}/g, "755.02.01")
                    .replace(/{KONU}/g, "Arşiv Projeleri İhale Dosyası")
                    .replace(/{RAF_NO}/g, "Raf-14")
                    .replace(/{KUTU_NO}/g, "Kutu-08"),
                }}
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                size="sm"
                onClick={() => {
                  window.print();
                  toast.success("Etiket yazıcıya gönderildi.");
                }}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold gap-1.5"
              >
                <Printer className="size-4" />
                <span>Yazdır</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsLabelPreviewOpen(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
