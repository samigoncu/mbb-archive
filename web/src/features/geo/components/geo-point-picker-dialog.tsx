"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useId, useRef, useState } from "react";
import {
  Check,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Pentagon,
  Route,
  Search,
  Shapes,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchGeoEntitiesAction, getGeoEntityDetailsAction } from "@/features/geo/api/geo-relation-actions";
import type { GeoEntitySummary } from "@/features/geo/model/geo";

export type GeoPickerMode = "point" | "polygon" | "linestring" | "cbs";

export type GeoPointPickerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  initialCoordinate?: string;
  defaultMode?: GeoPickerMode;
  onSelect: (value: string, summary?: string) => void;
};

/**
 * Küresel yüzeyde (WGS84) Geodesic poligon alanı hesaplar (metrekare).
 */
function calculatePolygonArea(coords: Array<{ lat: number; lng: number }>): number {
  if (coords.length < 3) return 0;
  const radius = 6378137; // metre
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    const rad1 = (p1.lat * Math.PI) / 180;
    const rad2 = (p2.lat * Math.PI) / 180;
    const deltaLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    area += deltaLng * (2 + Math.sin(rad1) + Math.sin(rad2));
  }
  area = Math.abs((area * radius * radius) / 2.0);
  return area;
}

function formatArea(sqMeters: number): string {
  if (sqMeters <= 0) return "0 m²";
  if (sqMeters >= 10000) {
    const ha = (sqMeters / 10000).toFixed(2);
    return `${Math.round(sqMeters).toLocaleString("tr-TR")} m² (${ha} ha)`;
  }
  if (sqMeters >= 1000) {
    const donum = (sqMeters / 1000).toFixed(2);
    return `${Math.round(sqMeters).toLocaleString("tr-TR")} m² (${donum} Dönüm)`;
  }
  return `${Math.round(sqMeters).toLocaleString("tr-TR")} m²`;
}

function calculatePolylineLength(coords: Array<{ lat: number; lng: number }>): number {
  if (coords.length < 2) return 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6378137;
  let length = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const lat1 = toRad(coords[i].lat);
    const lon1 = toRad(coords[i].lng);
    const lat2 = toRad(coords[i + 1].lat);
    const lon2 = toRad(coords[i + 1].lng);
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    length += R * c;
  }
  return length;
}

function formatLength(meters: number): string {
  if (meters <= 0) return "0 m";
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km (${Math.round(meters).toLocaleString("tr-TR")} m)`;
  }
  return `${Math.round(meters).toLocaleString("tr-TR")} m`;
}

export function GeoPointPickerDialog({
  isOpen,
  onClose,
  initialCoordinate,
  defaultMode,
  onSelect,
}: GeoPointPickerDialogProps) {
  const containerId = useId().replace(/:/g, "");
  const [isMaximized, setIsMaximized] = useState(false);

  // Başlangıç modunu belirleme
  const [mode, setMode] = useState<GeoPickerMode>(() => {
    if (defaultMode) return defaultMode;
    if (initialCoordinate?.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(initialCoordinate);
        if (parsed.type === "Polygon") return "polygon";
        if (parsed.type === "LineString") return "linestring";
        if (parsed.type === "EntityRef") return "cbs";
      } catch { }
    }
    return "point";
  });

  // Nokta modu durumu
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(() => {
    if (!initialCoordinate) return null;
    const trimmed = initialCoordinate.trim();
    if (!trimmed.startsWith("{")) {
      const parts = trimmed.split(",").map((p) => Number(p.trim()));
      if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        return { lat: parts[0], lng: parts[1] };
      }
    }
    return null;
  });

  // Poligon modu durumu
  const [polygonPoints, setPolygonPoints] = useState<Array<{ lat: number; lng: number }>>(() => {
    if (initialCoordinate?.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(initialCoordinate);
        if (parsed.type === "Polygon" && Array.isArray(parsed.coordinates?.[0])) {
          const raw = parsed.coordinates[0];
          return raw.map((pt: [number, number]) => ({ lat: pt[1], lng: pt[0] })).slice(0, -1);
        }
      } catch { }
    }
    return [];
  });

  // Çizgi modu durumu
  const [linePoints, setLinePoints] = useState<Array<{ lat: number; lng: number }>>(() => {
    if (initialCoordinate?.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(initialCoordinate);
        if (parsed.type === "LineString" && Array.isArray(parsed.coordinates)) {
          return parsed.coordinates.map((pt: [number, number]) => ({ lat: pt[1], lng: pt[0] }));
        }
      } catch { }
    }
    return [];
  });

  // CBS Varlık modu durumu
  const [cbsSearchQuery, setCbsSearchQuery] = useState("");
  const [cbsResults, setCbsResults] = useState<GeoEntitySummary[]>([]);
  const [isSearchingCbs, setIsSearchingCbs] = useState(false);
  const [selectedCbsEntity, setSelectedCbsEntity] = useState<{
    id: string;
    name: string;
    entityType: string;
    geoJson: string;
  } | null>(() => {
    if (initialCoordinate?.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(initialCoordinate);
        if (parsed.type === "EntityRef") {
          return {
            id: parsed.entityId,
            name: parsed.name,
            entityType: parsed.entityType,
            geoJson: parsed.geoJson,
          };
        }
      } catch { }
    }
    return null;
  });

  const mapRef = useRef<import("leaflet").Map | null>(null);
  const pointMarkerRef = useRef<import("leaflet").CircleMarker | null>(null);
  const polygonLayerGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const lineLayerGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const cbsLayerGroupRef = useRef<import("leaflet").GeoJSON | null>(null);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Harita başlatma
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function initMap() {
      const leaflet = (await import("leaflet")).default;
      if (cancelled) return;

      const defaultLat = selectedPoint?.lat ?? polygonPoints[0]?.lat ?? linePoints[0]?.lat ?? 38.3552;
      const defaultLng = selectedPoint?.lng ?? polygonPoints[0]?.lng ?? linePoints[0]?.lng ?? 38.3095;
      const defaultZoom = selectedPoint || polygonPoints.length > 0 || linePoints.length > 0 ? 16 : 13;

      const map = leaflet
        .map(containerId, { attributionControl: true })
        .setView([defaultLat, defaultLng], defaultZoom);

      const baseMaps: Record<string, import("leaflet").Layer> = {};

      const osm = leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
        maxZoom: 19,
      });
      baseMaps["Standart (OSM)"] = osm;

      const satellite = leaflet.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri &mdash; Kaynak: Esri, Maxar",
          maxZoom: 19,
        },
      );
      baseMaps["Uydu Görünümü (Esri)"] = satellite;

      const topo = leaflet.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
        attribution: 'Harita: &copy; <a href="https://opentopomap.org" target="_blank" rel="noopener noreferrer">OpenTopoMap</a>',
        maxZoom: 17,
        subdomains: "abc",
      });
      baseMaps["Topoğrafya (Arazi)"] = topo;

      const light = leaflet.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 20,
        subdomains: "abcd",
      });
      baseMaps["Açık / Sade (CartoDB)"] = light;

      osm.addTo(map);
      leaflet.control.layers(baseMaps, undefined, { collapsed: true, position: "topright" }).addTo(map);

      // Layer gruplarını oluştur
      polygonLayerGroupRef.current = leaflet.layerGroup().addTo(map);
      lineLayerGroupRef.current = leaflet.layerGroup().addTo(map);

      // Harita tıklama dinleyicisi
      map.on("click", (e) => {
        const currentMode = modeRef.current;
        const { lat, lng } = e.latlng;

        if (currentMode === "point") {
          if (pointMarkerRef.current) {
            pointMarkerRef.current.setLatLng([lat, lng]);
          } else {
            pointMarkerRef.current = leaflet
              .circleMarker([lat, lng], {
                radius: 9,
                color: "#dc2626",
                fillColor: "#ef4444",
                fillOpacity: 0.9,
                weight: 3,
              })
              .addTo(map);
          }
          setSelectedPoint({ lat, lng });
        } else if (currentMode === "polygon") {
          setPolygonPoints((prev) => [...prev, { lat, lng }]);
        } else if (currentMode === "linestring") {
          setLinePoints((prev) => [...prev, { lat, lng }]);
        }
      });

      // Dialog animasyonu sonrası boyutları güncelle
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 400);

      mapRef.current = map;
    }

    void initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      pointMarkerRef.current = null;
      polygonLayerGroupRef.current = null;
      lineLayerGroupRef.current = null;
      cbsLayerGroupRef.current = null;
    };
  }, [isOpen, containerId]);

  // Nokta değiştiğinde haritada güncelle
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    async function syncPoint() {
      const leaflet = (await import("leaflet")).default;
      if (selectedPoint) {
        if (pointMarkerRef.current) {
          pointMarkerRef.current.setLatLng([selectedPoint.lat, selectedPoint.lng]);
        } else {
          pointMarkerRef.current = leaflet
            .circleMarker([selectedPoint.lat, selectedPoint.lng], {
              radius: 9,
              color: "#dc2626",
              fillColor: "#ef4444",
              fillOpacity: 0.9,
              weight: 3,
            })
            .addTo(map);
        }
      }
    }
    void syncPoint();
  }, [selectedPoint]);

  // Poligon noktaları değiştiğinde katmanı güncelle
  useEffect(() => {
    if (!mapRef.current || !polygonLayerGroupRef.current) return;
    const map = mapRef.current;
    const group = polygonLayerGroupRef.current;

    async function syncPolygon() {
      const leaflet = (await import("leaflet")).default;
      group.clearLayers();

      if (polygonPoints.length === 0) return;

      // Köşe noktalarını ekle
      polygonPoints.forEach((pt, idx) => {
        leaflet
          .circleMarker([pt.lat, pt.lng], {
            radius: idx === 0 ? 7 : 5,
            color: idx === 0 ? "#16a34a" : "#e11d48",
            fillColor: idx === 0 ? "#22c55e" : "#f43f5e",
            fillOpacity: 1,
            weight: 2,
          })
          .bindTooltip(`Köşe ${idx + 1}`, { direction: "top", offset: [0, -6] })
          .addTo(group);
      });

      // Poligon veya önizleme çizgisi
      const latlngs = polygonPoints.map((p) => [p.lat, p.lng] as [number, number]);
      if (polygonPoints.length >= 3) {
        leaflet
          .polygon(latlngs, {
            color: "#e11d48",
            fillColor: "#f43f5e",
            fillOpacity: 0.25,
            weight: 2.5,
          })
          .addTo(group);
      } else if (polygonPoints.length === 2) {
        leaflet
          .polyline(latlngs, {
            color: "#e11d48",
            dashArray: "5, 8",
            weight: 2,
          })
          .addTo(group);
      }
    }

    void syncPolygon();
  }, [polygonPoints]);

  // Çizgi noktaları değiştiğinde katmanı güncelle
  useEffect(() => {
    if (!mapRef.current || !lineLayerGroupRef.current) return;
    const group = lineLayerGroupRef.current;

    async function syncLine() {
      const leaflet = (await import("leaflet")).default;
      group.clearLayers();

      if (linePoints.length === 0) return;

      linePoints.forEach((pt, idx) => {
        leaflet
          .circleMarker([pt.lat, pt.lng], {
            radius: 5,
            color: "#2563eb",
            fillColor: "#3b82f6",
            fillOpacity: 1,
            weight: 2,
          })
          .bindTooltip(`Nokta ${idx + 1}`, { direction: "top", offset: [0, -6] })
          .addTo(group);
      });

      if (linePoints.length >= 2) {
        const latlngs = linePoints.map((p) => [p.lat, p.lng] as [number, number]);
        leaflet
          .polyline(latlngs, {
            color: "#2563eb",
            weight: 3.5,
          })
          .addTo(group);
      }
    }

    void syncLine();
  }, [linePoints]);

  // CBS Varlık seçildiğinde haritada vurgula
  useEffect(() => {
    if (!mapRef.current || !selectedCbsEntity) return;
    const map = mapRef.current;

    async function syncCbsEntity() {
      const leaflet = (await import("leaflet")).default;
      if (cbsLayerGroupRef.current) {
        map.removeLayer(cbsLayerGroupRef.current);
        cbsLayerGroupRef.current = null;
      }

      if (!selectedCbsEntity?.geoJson) return;

      try {
        const geoJsonData = JSON.parse(selectedCbsEntity.geoJson);
        const geoJsonLayer = leaflet.geoJSON(geoJsonData, {
          style: {
            color: "#7c3aed",
            fillColor: "#8b5cf6",
            fillOpacity: 0.35,
            weight: 3,
          },
          pointToLayer: (_feature, latlng) =>
            leaflet.circleMarker(latlng, {
              radius: 9,
              color: "#6d28d9",
              fillColor: "#8b5cf6",
              fillOpacity: 0.9,
              weight: 3,
            }),
        });

        geoJsonLayer.addTo(map);
        cbsLayerGroupRef.current = geoJsonLayer;

        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
        }
      } catch { }
    }

    void syncCbsEntity();
  }, [selectedCbsEntity]);

  // GPS ile Konumumu Bul
  function handleLocateMe() {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedPoint({ lat: latitude, lng: longitude });
        mapRef.current?.setView([latitude, longitude], 17);
        if (pointMarkerRef.current) {
          pointMarkerRef.current.setLatLng([latitude, longitude]);
        }
      },
      () => { },
    );
  }

  // CBS Varlık Ara
  async function handleSearchCbs(query: string) {
    setCbsSearchQuery(query);
    if (!query.trim()) {
      setCbsResults([]);
      return;
    }
    setIsSearchingCbs(true);
    try {
      const items = await searchGeoEntitiesAction(query.trim());
      setCbsResults(items);
    } catch {
      setCbsResults([]);
    } finally {
      setIsSearchingCbs(false);
    }
  }

  // CBS Varlığı Seç
  async function handleSelectCbsEntity(summary: GeoEntitySummary) {
    try {
      const details = await getGeoEntityDetailsAction(summary.id);
      if (details) {
        setSelectedCbsEntity({
          id: details.id,
          name: details.name,
          entityType: details.entityType,
          geoJson: details.geoJson,
        });
      }
    } catch { }
  }

  // Seçimi Onayla
  function handleConfirm() {
    if (mode === "point" && selectedPoint) {
      const val = `${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}`;
      onSelect(val, `Nokta (${selectedPoint.lat.toFixed(4)}, ${selectedPoint.lng.toFixed(4)})`);
    } else if (mode === "polygon" && polygonPoints.length >= 3) {
      // Kapalı halka oluştur: ilk nokta son nokta olarak da eklenir
      const closed = [...polygonPoints.map((p) => [p.lng, p.lat]), [polygonPoints[0].lng, polygonPoints[0].lat]];
      const geoJson = {
        type: "Polygon",
        coordinates: [closed],
      };
      const area = calculatePolygonArea(polygonPoints);
      onSelect(JSON.stringify(geoJson), `Poligon (${polygonPoints.length} köşe - ${formatArea(area)})`);
    } else if (mode === "linestring" && linePoints.length >= 2) {
      const geoJson = {
        type: "LineString",
        coordinates: linePoints.map((p) => [p.lng, p.lat]),
      };
      const length = calculatePolylineLength(linePoints);
      onSelect(JSON.stringify(geoJson), `Çizgi / Hat (${linePoints.length} nokta - ${formatLength(length)})`);
    } else if (mode === "cbs" && selectedCbsEntity) {
      const ref = {
        type: "EntityRef",
        entityId: selectedCbsEntity.id,
        name: selectedCbsEntity.name,
        entityType: selectedCbsEntity.entityType,
        geoJson: selectedCbsEntity.geoJson,
      };
      onSelect(JSON.stringify(ref), `CBS: ${selectedCbsEntity.name} (${selectedCbsEntity.entityType})`);
    }
    onClose();
  }

  const polygonArea = calculatePolygonArea(polygonPoints);
  const lineLength = calculatePolylineLength(linePoints);

  const canConfirm =
    (mode === "point" && selectedPoint !== null) ||
    (mode === "polygon" && polygonPoints.length >= 3) ||
    (mode === "linestring" && linePoints.length >= 2) ||
    (mode === "cbs" && selectedCbsEntity !== null);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "overflow-hidden p-0 transition-all duration-200 border border-border/80 shadow-2xl rounded-2xl",
          isMaximized
            ? "!fixed !inset-2 !h-[calc(100vh-16px)] !max-h-[calc(100vh-16px)] !w-[calc(100vw-16px)] !max-w-[calc(100vw-16px)] sm:!max-w-[calc(100vw-16px)]"
            : "w-[95vw] sm:w-[94vw] md:w-[92vw] lg:w-[90vw] xl:w-[1240px] max-w-[1280px] sm:max-w-none max-h-[92vh]",
        )}
      >
        {/* Modal Başlığı ve Mod Sekmeleri */}
        <div className="border-b border-border bg-card/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shapes className="size-5 text-primary" />
              <div>
                <DialogTitle className="text-base font-semibold">
                  Harita & Coğrafi Varlık Seçici
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Nokta (pin), poligon (parsel/alan), çizgi veya mevcut MBB CBS katmanlarından varlık seçin.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mr-6">
              <button
                type="button"
                onClick={() => {
                  setIsMaximized((prev) => !prev);
                  setTimeout(() => mapRef.current?.invalidateSize(), 250);
                }}
                title={isMaximized ? "Pencere Boyutuna Dön" : "Tam Ekran Yap"}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {isMaximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              </button>
            </div>
          </div>

          {/* Çizim & Seçim Modu Çubuğu */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
            <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 text-xs">
              <button
                type="button"
                onClick={() => setMode("point")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                  mode === "point"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <MapPin className="size-3.5 text-rose-600" />
                Nokta (Pin)
              </button>

              <button
                type="button"
                onClick={() => setMode("polygon")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                  mode === "polygon"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Pentagon className="size-3.5 text-amber-600" />
                Poligon (Alan / Parsel)
              </button>

              <button
                type="button"
                onClick={() => setMode("linestring")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                  mode === "linestring"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Route className="size-3.5 text-blue-600" />
                Çizgi (Yol / Hat)
              </button>

              <button
                type="button"
                onClick={() => setMode("cbs")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                  mode === "cbs"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Search className="size-3.5 text-purple-600" />
                CBS Katmanından Seç
              </button>
            </div>

            {/* Modlara Özel Hızlı Eylemler & Rozetler */}
            <div className="flex items-center gap-2 text-xs">
              {mode === "point" && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleLocateMe}
                  className="gap-1 text-xs"
                >
                  <LocateFixed className="size-3 text-sky-600" />
                  Konumumu Bul
                </Button>
              )}

              {mode === "polygon" && (
                <>
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-400">
                    {polygonPoints.length} Köşe | Alan: {formatArea(polygonArea)}
                  </span>
                  {polygonPoints.length > 0 && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setPolygonPoints((prev) => prev.slice(0, -1))}
                        title="Son köşeyi geri al"
                        className="gap-1 text-xs"
                      >
                        <Undo2 className="size-3" />
                        Geri Al
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setPolygonPoints([])}
                        title="Alanı temizle"
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                        Temizle
                      </Button>
                    </>
                  )}
                </>
              )}

              {mode === "linestring" && (
                <>
                  <span className="rounded bg-blue-500/10 px-2 py-0.5 font-medium text-blue-700 dark:text-blue-400">
                    {linePoints.length} Nokta | Uzunluk: {formatLength(lineLength)}
                  </span>
                  {linePoints.length > 0 && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setLinePoints((prev) => prev.slice(0, -1))}
                        title="Son noktayı geri al"
                        className="gap-1 text-xs"
                      >
                        <Undo2 className="size-3" />
                        Geri Al
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setLinePoints([])}
                        title="Çizgiyi temizle"
                        className="text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                        Temizle
                      </Button>
                    </>
                  )}
                </>
              )}

              {mode === "cbs" && selectedCbsEntity && (
                <span className="rounded bg-purple-500/10 px-2 py-0.5 font-medium text-purple-700 dark:text-purple-400">
                  {selectedCbsEntity.name} ({selectedCbsEntity.entityType})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CBS Varlık Arama Paneli (Yalnızca CBS modunda haritanın üstünde açılır) */}
        {mode === "cbs" && (
          <div className="border-b border-border bg-background p-3">
            <div className="relative max-w-lg">
              <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={cbsSearchQuery}
                onChange={(e) => void handleSearchCbs(e.target.value)}
                placeholder="Mahalle, parsel, yol veya bina adı yazarak arayın..."
                className="w-full rounded-md border border-input bg-card py-1.5 pr-3 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            {isSearchingCbs && (
              <div className="mt-2 text-xs text-muted-foreground">Aranıyor...</div>
            )}
            {cbsResults.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-border bg-card p-1">
                {cbsResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void handleSelectCbsEntity(item)}
                    className={cn(
                      "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                      selectedCbsEntity?.id === item.id && "bg-primary/10 font-semibold text-primary",
                    )}
                  >
                    <span>{item.name}</span>
                    <span className="text-[10px] text-muted-foreground">{item.entityType}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Harita Konteyneri */}
        <div
          className={cn(
            "relative w-full border-b border-border bg-muted/20",
            isMaximized ? "h-[calc(100vh-180px)]" : "h-[620px] max-h-[70vh] min-h-[460px]",
          )}
        >
          <div id={containerId} className="size-full" />

          {/* Çizim Rehber Bilgisi */}
          <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-md bg-background/90 px-3 py-1.5 text-xs text-foreground shadow-md backdrop-blur-xs border border-border/80">
            {mode === "point" && (
              <span>Haritaya tıklayarak kırmızı işaretçiyi istediğiniz konuma bırakın.</span>
            )}
            {mode === "polygon" && (
              <span>
                Haritaya tıklayarak parselin veya sahanın köşe noktalarını ekleyin (en az 3 köşe).
              </span>
            )}
            {mode === "linestring" && (
              <span>Haritaya tıklayarak yol veya hattın güzergah noktalarını ekleyin.</span>
            )}
            {mode === "cbs" && (
              <span>Yukarıdaki arama kutusundan MBB CBS varlığı seçin.</span>
            )}
          </div>
        </div>

        {/* Footer: Bilgilendirme ve Onay Butonları */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 text-xs">
            {mode === "point" && selectedPoint && (
              <span className="font-mono text-muted-foreground">
                Seçilen Koordinat:{" "}
                <strong className="text-foreground">
                  {selectedPoint.lat.toFixed(6)}, {selectedPoint.lng.toFixed(6)}
                </strong>
              </span>
            )}
            {mode === "polygon" && (
              <span className="text-muted-foreground">
                Seçilen Poligon:{" "}
                <strong className="text-foreground">
                  {polygonPoints.length} Köşe ({formatArea(polygonArea)})
                </strong>
              </span>
            )}
            {mode === "linestring" && (
              <span className="text-muted-foreground">
                Seçilen Hat:{" "}
                <strong className="text-foreground">
                  {linePoints.length} Nokta ({formatLength(lineLength)})
                </strong>
              </span>
            )}
            {mode === "cbs" && selectedCbsEntity && (
              <span className="text-muted-foreground">
                Seçilen Varlık:{" "}
                <strong className="text-foreground">{selectedCbsEntity.name}</strong> (
                {selectedCbsEntity.entityType})
              </span>
            )}
            {!canConfirm && (
              <span className="text-muted-foreground">Henüz seçim yapılmadı.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              <X className="size-3.5" />
              Vazgeç
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!canConfirm}
              onClick={handleConfirm}
              className="gap-1.5"
            >
              <Check className="size-3.5" />
              Seçimi Onayla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
