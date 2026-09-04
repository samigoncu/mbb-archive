"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileStack,
  Flame,
  Gauge,
  HardDrive,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  MoveRight,
  Printer,
  QrCode,
  Radio,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Trash2,
  Wind,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { LocationOccupancyItem } from "@/features/physical-archive/api/get-occupancy";
import type { FolderListItem } from "@/features/physical-archive/model/folder";

type CompactRack = {
  id: string;
  code: string;
  name: string;
  isOpen: boolean;
  totalShelves: number;
  capacity: number;
  used: number;
  shelves: {
    letter: string;
    capacity: number;
    boxes: {
      code: string;
      label: string;
      folderCount: number;
      barcode: string;
      adaParsel?: string;
    }[];
  }[];
};

export function ArchiveSimulatorView({
  locations,
  folders,
}: {
  locations: LocationOccupancyItem[];
  folders: FolderListItem[];
}) {
  const [activeTab, setActiveTab] = useState<"depo" | "cbs" | "yangin">("depo");

  // Gerçek Veritabanından Türetilen Dinamik Raylı Dolaplar
  const initialRacks: CompactRack[] = useMemo(() => {
    if (locations.length === 0) return [];

    const racksList: CompactRack[] = [];
    // Depo veya oda altındaki birimler
    const parentUnits = locations.filter((l) => l.parentId === null || l.type === "Room" || l.type === "Aisle");
    const unitsToProcess = parentUnits.length > 0 ? parentUnits : locations.slice(0, 5);

    unitsToProcess.forEach((unit, idx) => {
      const childShelves = locations.filter((l) => l.parentId === unit.id);
      const shelfLetters = childShelves.length > 0
        ? childShelves.map((cs, cIdx) => ({
            letter: String.fromCharCode(65 + cIdx),
            capacity: cs.capacity ?? 20,
            boxes: folders
              .filter((f) => f.locationId === cs.id || f.locationCode === cs.code)
              .map((f) => ({
                code: f.barcode,
                label: f.title,
                folderCount: f.documentCount,
                barcode: f.barcode,
                adaParsel: f.title.match(/(\d+)\s*(?:Ada|\/)/i)?.[1] ?? undefined,
              })),
          }))
        : [
            {
              letter: "A",
              capacity: unit.capacity ?? 20,
              boxes: folders
                .filter((f) => f.locationId === unit.id || f.locationCode === unit.code)
                .map((f) => ({
                  code: f.barcode,
                  label: f.title,
                  folderCount: f.documentCount,
                  barcode: f.barcode,
                  adaParsel: f.title.match(/(\d+)\s*(?:Ada|\/)/i)?.[1] ?? undefined,
                })),
            },
          ];

      const totalCap = unit.capacity ?? shelfLetters.reduce((s, sl) => s + sl.capacity, 0);
      const totalUsed = unit.folderCount;

      racksList.push({
        id: unit.id,
        code: unit.code,
        name: unit.name,
        isOpen: idx === 0,
        totalShelves: shelfLetters.length,
        capacity: totalCap,
        used: totalUsed,
        shelves: shelfLetters,
      });
    });

    return racksList;
  }, [locations, folders]);

  const [racks, setRacks] = useState<CompactRack[]>(initialRacks);
  const [selectedRackId, setSelectedRackId] = useState<string>(initialRacks[0]?.id ?? "");
  const [selectedBox, setSelectedBox] = useState<{
    code: string;
    label: string;
    folderCount: number;
    barcode: string;
    adaParsel?: string;
  } | null>(null);

  // CBS / Kadastro Parselleri (Gerçek Klasörlerden Türetilir)
  const gisParcels = useMemo(() => {
    return folders
      .filter((f) => f.title.toLowerCase().includes("ada") || f.title.toLowerCase().includes("parsel"))
      .map((f, idx) => {
        const adaMatch = f.title.match(/(\d+)\s*Ada/i);
        const parselMatch = f.title.match(/(\d+)\s*Parsel/i);
        return {
          id: `p-${idx + 1}`,
          adaParsel: adaMatch && parselMatch ? `${adaMatch[1]}/${parselMatch[1]}` : `Ada ${idx + 100}`,
          mahalle: f.title.includes("Battalgazi") ? "Battalgazi" : f.title.includes("Yeşilyurt") ? "Yeşilyurt" : "Merkez",
          docCount: f.documentCount || 1,
          folderBarcode: f.barcode,
          folderTitle: f.title,
          shelfLocation: f.locationName || "Merkez Depo",
          top: 30 + (idx * 15) % 50,
          left: 20 + (idx * 18) % 60,
        };
      });
  }, [folders]);

  const [selectedParcel, setSelectedParcel] = useState(gisParcels[0] ?? null);
  const [cbsTab, setCbsTab] = useState<"belge" | "ocr" | "harita" | "indeks">("belge");
  const [isFireSimulated, setIsFireSimulated] = useState(false);

  const selectedRack = racks.find((r) => r.id === selectedRackId) ?? racks[0];

  function openAisle(rackId: string) {
    setRacks((prev) =>
      prev.map((r) => ({
        ...r,
        isOpen: r.id === rackId,
      }))
    );
    setSelectedRackId(rackId);
    toast.success(`${racks.find((r) => r.id === rackId)?.code} koridoru motorize ray sistemi ile açıldı.`);
  }

  function moveBoxToShelf(targetShelfLetter: string) {
    if (!selectedBox || !selectedRack) return;

    setRacks((prev) =>
      prev.map((rack) => {
        if (rack.id !== selectedRack.id) return rack;
        const updatedShelves = rack.shelves.map((shelf) => {
          const filteredBoxes = shelf.boxes.filter((b) => b.code !== selectedBox.code);
          if (shelf.letter === targetShelfLetter) {
            return {
              ...shelf,
              boxes: [...filteredBoxes, selectedBox],
            };
          }
          return {
            ...shelf,
            boxes: filteredBoxes,
          };
        });
        return {
          ...rack,
          shelves: updatedShelves,
        };
      })
    );

    toast.success(
      `Kutu '${selectedBox.code}' başarıyla Raf ${targetShelfLetter} konumuna aktarıldı ve barkod güncellendi.`
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1. ÜST NAVİGASYON ŞERİDİ & 3 ANA SEKME */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("depo")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === "depo"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <HardDrive className="size-4" />
            <span>Fiziksel Depo & Raylı Dolap Simülatörü</span>
          </button>

          <button
            onClick={() => setActiveTab("cbs")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === "cbs"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <MapPin className="size-4" />
            <span>Haritada Gör (CBS / Kadastro)</span>
          </button>

          <button
            onClick={() => setActiveTab("yangin")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
              activeTab === "yangin"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Flame className="size-4 text-orange-400" />
            <span>HFC-227ea Yangın & İklim Sensörü</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-mono text-[10px]">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
            {locations.length} Yerleşim Birimi · {folders.length} Klasör
          </Badge>
        </div>
      </div>

      {/* SEKME 1: FİZİKSEL DEPO & RAYLI DOLAP */}
      {activeTab === "depo" && (
        <div className="flex flex-col gap-4">
          {racks.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              <HardDrive className="size-12 mx-auto text-primary/40 mb-3" />
              <h3 className="text-base font-bold text-foreground">Kayıtlı Fiziksel Arşiv Yerleşimi Yok</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Sistemde henüz kayıtlı depo, oda, dolap veya raf bulunmamaktadır. Klasörlerinizi yerleştirmek için yerleşim hiyerarşisi oluşturun.
              </p>
              <Link
                href="/arsiv-yerlesimi"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm"
              >
                Arşiv Yerleşimi Tanımla →
              </Link>
            </div>
          ) : (
            <>
              {/* Dolap Seçim Butonları */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {racks.map((rack) => {
                  const isSelected = selectedRack?.id === rack.id;
                  const percent = rack.capacity > 0 ? Math.round((rack.used / rack.capacity) * 100) : 0;

                  return (
                    <div
                      key={rack.id}
                      onClick={() => openAisle(rack.id)}
                      className={`relative flex flex-col justify-between rounded-xl border-2 p-3 transition-all cursor-pointer select-none ${
                        isSelected
                          ? "border-sky-600 bg-sky-500/10 shadow-md"
                          : "border-border bg-card hover:border-sky-400 hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-black text-sky-600 dark:text-sky-400">
                          {rack.code}
                        </span>
                        {rack.isOpen ? (
                          <span className="rounded bg-sky-500 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                            Koridor Açık
                          </span>
                        ) : (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                            Kilitli
                          </span>
                        )}
                      </div>

                      <div className="my-2">
                        <h4 className="text-xs font-bold text-foreground truncate">{rack.name}</h4>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                          <span>Doluluk: %{percent}</span>
                          <span>{rack.used} / {rack.capacity}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${percent > 85 ? "bg-red-500" : percent > 60 ? "bg-amber-500" : "bg-sky-500"}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAisle(rack.id);
                        }}
                        className="w-full mt-1 rounded bg-muted hover:bg-sky-600 hover:text-white py-1 text-[10px] font-bold transition-colors text-center"
                      >
                        {rack.isOpen ? "Aktif İnceleniyor" : "Koridoru Aç →"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Seçili Dolabın Rafları ve Kutuları */}
              <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-sky-600 text-white font-mono text-xs font-bold px-2.5 py-1">
                      {selectedRack?.code}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">{selectedRack?.name} Dikey Raf Dizilimi</h3>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Toplam {selectedRack?.shelves.length} Dikey Raf Seviyesi
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {selectedRack?.shelves.map((shelf) => (
                    <div
                      key={shelf.letter}
                      className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-3"
                    >
                      <div className="flex items-center justify-between border-b border-border pb-1.5 font-mono text-xs font-bold text-sky-600">
                        <span>Raf {shelf.letter}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {shelf.boxes.length} Kutu / Klasör
                        </span>
                      </div>

                      <div className="flex flex-col gap-2 min-h-[140px]">
                        {shelf.boxes.map((box) => {
                          const isBoxSelected = selectedBox?.barcode === box.barcode;
                          return (
                            <div
                              key={box.barcode}
                              onClick={() => setSelectedBox(box)}
                              className={`rounded-lg border p-2 text-xs transition-all cursor-pointer ${
                                isBoxSelected
                                  ? "border-amber-500 bg-amber-500/10 shadow-xs"
                                  : "border-border bg-card hover:border-amber-400"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-primary text-[10px]">{box.barcode}</span>
                                <span className="text-[10px] text-muted-foreground">{box.folderCount} Evrak</span>
                              </div>
                              <p className="font-medium text-foreground text-[11px] truncate mt-0.5">{box.label}</p>
                            </div>
                          );
                        })}

                        {shelf.boxes.length === 0 && (
                          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-3 text-[10px] text-muted-foreground">
                            Boş Raf Seviyesi
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Seçili Kutu Taşıma İşlemi */}
                {selectedBox && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <QrCode className="size-4 text-amber-500" />
                      <span>
                        Seçili Klasör: <strong>{selectedBox.barcode}</strong> - {selectedBox.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground font-semibold">Başka Rafa Taşı:</span>
                      {selectedRack?.shelves.map((s) => (
                        <button
                          key={s.letter}
                          onClick={() => moveBoxToShelf(s.letter)}
                          className="rounded bg-card border border-border hover:bg-amber-600 hover:text-white px-2 py-1 font-mono font-bold text-[10px] transition-colors"
                        >
                          Raf {s.letter}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* SEKME 2: HARİTADA GÖR (CBS / KADASTRO) */}
      {activeTab === "cbs" && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col gap-4">
          <div className="border-b border-border pb-2.5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <MapPin className="size-4 text-sky-500" />
              Malatya Büyükşehir Belediyesi CBS & Kadastro Arşiv Entegrasyonu
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              İmar ve tapu arşivindeki fiziksel dosyaların coğrafi bilgi sistemi ada/parsel koordinatları ile mekansal eşleşmesi.
            </p>
          </div>

          {gisParcels.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              <MapPin className="size-10 mx-auto text-primary/40 mb-2" />
              <p className="font-bold text-foreground">Haritada Gösterilecek Kadastro/İmar Dosyası Yok</p>
              <p className="mt-1">
                Sistemde kayıtlı klasörler arasında ada/parsel bilgisi içeren bir arşiv dosyası henüz bulunmamaktadır.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Sol: Parsel Listesi */}
              <div className="lg:col-span-4 flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-1">
                {gisParcels.map((p) => {
                  const isSelected = selectedParcel?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedParcel(p)}
                      className={`rounded-xl border p-3 transition-all cursor-pointer ${
                        isSelected
                          ? "border-sky-600 bg-sky-500/10 shadow-xs"
                          : "border-border bg-background hover:border-sky-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sky-600 text-xs">{p.adaParsel}</span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{p.mahalle}</span>
                      </div>
                      <h4 className="font-semibold text-foreground text-xs mt-1 truncate">{p.folderTitle}</h4>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-2 pt-1.5 border-t border-border/50">
                        <span>Konum: {p.shelfLocation}</span>
                        <span className="font-bold text-primary">{p.folderBarcode}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sağ: CBS Detay Paneli */}
              <div className="lg:col-span-8 rounded-xl border border-border bg-muted/10 p-4 flex flex-col gap-3">
                {selectedParcel && (
                  <>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div>
                        <span className="text-xs text-muted-foreground">Seçili Kadastro Parseli:</span>
                        <h4 className="text-sm font-bold text-foreground">{selectedParcel.adaParsel} - {selectedParcel.mahalle}</h4>
                      </div>
                      <Badge className="bg-sky-600 text-white font-mono text-[10px]">
                        Fiziki Raf: {selectedParcel.shelfLocation}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-lg border border-border bg-card p-3">
                        <span className="text-muted-foreground text-[10px]">Klasör Başlığı</span>
                        <p className="font-semibold text-foreground mt-0.5">{selectedParcel.folderTitle}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-card p-3">
                        <span className="text-muted-foreground text-[10px]">Arşiv Barkodu</span>
                        <p className="font-mono font-bold text-primary mt-0.5">{selectedParcel.folderBarcode}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-300 bg-slate-200 dark:bg-slate-800 p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
                      <MapPin className="size-10 text-rose-500 animate-bounce mb-2" />
                      <span className="font-bold text-foreground text-xs">CBS Kadastro Harita Koordinatı</span>
                      <span className="font-mono text-[11px] text-muted-foreground mt-1">
                        38°21&apos;02.4&quot;N 38°18&apos;55.1&quot;E · Malatya Büyükşehir Coğrafi Bilgi Sistemi
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEKME 3: HFC-227ea YANGIN & İKLİM SENSÖRÜ */}
      {activeTab === "yangin" && (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Flame className="size-4 text-orange-500" />
                Merkez Arşiv Deposu HFC-227ea Gazlı Yangın & İklimlendirme Telemetrisi
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                TS EN 54 standardında gazlı söndürme tüpleri ve iklim sensörlerinin canlı telemetri durumu.
              </p>
            </div>

            <button
              onClick={() => {
                setIsFireSimulated(!isFireSimulated);
                if (!isFireSimulated) {
                  toast.error("YANGIN VE DUMAN ALARMI TETİKLENDİ! HFC-227ea tahliye vanası hazır.");
                } else {
                  toast.success("Yangın alarmı sıfırlandı. Sistem normal moda döndü.");
                }
              }}
              className={`rounded-lg px-3.5 py-2 text-xs font-bold text-white transition-all ${
                isFireSimulated ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-orange-600 hover:bg-orange-700"
              }`}
            >
              {isFireSimulated ? "Alarmı Sıfırla" : "Yangın Senaryosu Simüle Et"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
              <span className="text-muted-foreground text-[10px] uppercase font-bold flex items-center gap-1">
                <Thermometer className="size-3 text-sky-500" /> Ortam Sıcaklığı
              </span>
              <h4 className="text-2xl font-black text-foreground">{isFireSimulated ? "68.5 °C (YÜKSEK)" : "20.4 °C"}</h4>
              <span className="text-[10px] text-muted-foreground">İdeal Arşiv Aralığı: 18 - 22 °C</span>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
              <span className="text-muted-foreground text-[10px] uppercase font-bold flex items-center gap-1">
                <Wind className="size-3 text-sky-500" /> Bağıl Nem
              </span>
              <h4 className="text-2xl font-black text-foreground">%48</h4>
              <span className="text-[10px] text-muted-foreground">İdeal Arşiv Aralığı: %45 - %55</span>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
              <span className="text-muted-foreground text-[10px] uppercase font-bold flex items-center gap-1">
                <Gauge className="size-3 text-emerald-500" /> HFC-227ea Tüp Basıncı
              </span>
              <h4 className="text-2xl font-black text-foreground">{isFireSimulated ? "0.0 Bar (BOŞALDI)" : "25.2 Bar"}</h4>
              <span className="text-[10px] text-muted-foreground">Nominal Çalışma Basıncı: 25.0 Bar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
