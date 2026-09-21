"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useId, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Loader2,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Paintbrush,
  Pentagon,
  Route,
  Search,
  Shapes,
  Sparkles,
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
  DialogTitle,
} from "@/components/ui/dialog";
import {
  searchGeoEntitiesAction,
  getGeoEntityDetailsAction,
  detectBuildingAtCoordinateAction,
} from "@/features/geo/api/geo-relation-actions";
import type { GeoEntitySummary } from "@/features/geo/model/geo";

export type GeoPickerMode = "point" | "building" | "polygon" | "linestring" | "cbs";

export type MarkerIconType =
  | "pin"
  | "store"
  | "coffee"
  | "atm"
  | "billboard"
  | "parking"
  | "building"
  | "park"
  | "fuel"
  | "facility";

export type MarkerColorType =
  | "red"
  | "blue"
  | "green"
  | "amber"
  | "purple"
  | "pink"
  | "cyan"
  | "slate";

export const MARKER_COLORS: Record<
  MarkerColorType,
  { name: string; hex: string; bgClass: string }
> = {
  red: { name: "Kırmızı", hex: "#ef4444", bgClass: "bg-red-500" },
  blue: { name: "Mavi", hex: "#3b82f6", bgClass: "bg-blue-500" },
  green: { name: "Yeşil", hex: "#10b981", bgClass: "bg-emerald-500" },
  amber: { name: "Turuncu / Kehribar", hex: "#f59e0b", bgClass: "bg-amber-500" },
  purple: { name: "Mor", hex: "#8b5cf6", bgClass: "bg-purple-500" },
  pink: { name: "Pembe / Fuşya", hex: "#ec4899", bgClass: "bg-pink-500" },
  cyan: { name: "Turkuaz", hex: "#06b6d4", bgClass: "bg-cyan-500" },
  slate: { name: "Antrasit / Füme", hex: "#334155", bgClass: "bg-slate-700" },
};

export const MARKER_ICONS: Record<
  MarkerIconType,
  { label: string; defaultColor: MarkerColorType; emoji: string; svg: string }
> = {
  pin: {
    label: "Standart Pin",
    defaultColor: "red",
    emoji: "📍",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`,
  },
  store: {
    label: "Büfe / Satış Noktası",
    defaultColor: "amber",
    emoji: "🏪",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>`,
  },
  coffee: {
    label: "Çay Bahçesi / Kafe",
    defaultColor: "green",
    emoji: "☕",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h12Z"/><path d="M6 2v2"/><path d="M17 11h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"/></svg>`,
  },
  atm: {
    label: "ATM / Bankamatik",
    defaultColor: "blue",
    emoji: "🏧",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
  },
  billboard: {
    label: "Reklam Panosu / Totem",
    defaultColor: "purple",
    emoji: "📢",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="3" rx="2"/><path d="M12 15v6"/><path d="M8 21h8"/></svg>`,
  },
  parking: {
    label: "Otopark",
    defaultColor: "blue",
    emoji: "🅿️",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>`,
  },
  building: {
    label: "Dükkan / Bina / İşyeri",
    defaultColor: "slate",
    emoji: "🏢",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>`,
  },
  park: {
    label: "Park / Yeşil Alan",
    defaultColor: "green",
    emoji: "🌳",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10v12"/><path d="M12 10a5 5 0 0 0-5-5c0-1.5 1-3 3-4 1.5 1 2 2.5 2 4a5 5 0 0 0 5 5c0-1.5-1-3-3-4-1.5 1-2 2.5-2 4Z"/></svg>`,
  },
  fuel: {
    label: "Akaryakıt / İstasyon",
    defaultColor: "amber",
    emoji: "⛽",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22h12"/><path d="M4 9h10"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/></svg>`,
  },
  facility: {
    label: "Tesis / Depo",
    defaultColor: "purple",
    emoji: "🏭",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>`,
  },
};

function createCustomMarkerIcon(
  leaflet: typeof import("leaflet"),
  iconType: MarkerIconType,
  colorType: MarkerColorType,
) {
  const iconDef = MARKER_ICONS[iconType] ?? MARKER_ICONS.pin;
  const colorDef = MARKER_COLORS[colorType] ?? MARKER_COLORS.red;

  const html = `
    <div style="position: relative; width: 38px; height: 44px; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: ${colorDef.hex};
        border: 2px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      ">
        <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; width: 17px; height: 17px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));">
          ${iconDef.svg}
        </div>
      </div>
      <div style="
        width: 10px;
        height: 4px;
        background: rgba(0,0,0,0.35);
        border-radius: 50%;
        margin-top: 3px;
        filter: blur(1px);
      "></div>
    </div>
  `;

  return leaflet.divIcon({
    html,
    className: "custom-map-marker-pin",
    iconSize: [38, 44],
    iconAnchor: [19, 42],
    popupAnchor: [0, -38],
  });
}

function calculatePolygonArea(coords: Array<{ lat: number; lng: number }>): number {
  if (coords.length < 3) return 0;
  const radius = 6378137;
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    const rad1 = (p1.lat * Math.PI) / 180;
    const rad2 = (p2.lat * Math.PI) / 180;
    const deltaLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    area += deltaLng * (2 + Math.sin(rad1) + Math.sin(rad2));
  }
  return Math.abs((area * radius * radius) / 2.0);
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
}: {
  isOpen: boolean;
  onClose: () => void;
  initialCoordinate?: string;
  defaultMode?: GeoPickerMode;
  onSelect: (value: string, summary?: string) => void;
}) {
  const containerId = useId().replace(/:/g, "");
  const [isMaximized, setIsMaximized] = useState(false);

  // İkon ve Renk Seçimi
  const [selectedIcon, setSelectedIcon] = useState<MarkerIconType>("pin");
  const [selectedColor, setSelectedColor] = useState<MarkerColorType>("red");
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Akıllı bina tespiti durumu
  const [isDetectingBuilding, setIsDetectingBuilding] = useState(false);
  const [detectedBuildingInfo, setDetectedBuildingInfo] = useState<string | null>(null);

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
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type === "Point" && Array.isArray(parsed.coordinates) && parsed.coordinates.length >= 2) {
          if (parsed.icon && parsed.icon in MARKER_ICONS) {
            setSelectedIcon(parsed.icon as MarkerIconType);
          }
          if (parsed.color && parsed.color in MARKER_COLORS) {
            setSelectedColor(parsed.color as MarkerColorType);
          }
          return { lat: parsed.coordinates[1], lng: parsed.coordinates[0] };
        }
      } catch { }
    } else {
      const parts = trimmed.split(",").map((p) => Number(p.trim()));
      if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
        return { lat: parts[0], lng: parts[1] };
      }
    }
    return null;
  });

  // Poligon modu durumu (bina modu ile ortak çalışır)
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
  const pointMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const polygonLayerGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const lineLayerGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const cbsLayerGroupRef = useRef<import("leaflet").GeoJSON | null>(null);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const selectedIconRef = useRef(selectedIcon);
  selectedIconRef.current = selectedIcon;

  const selectedColorRef = useRef(selectedColor);
  selectedColorRef.current = selectedColor;

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

      polygonLayerGroupRef.current = leaflet.layerGroup().addTo(map);
      lineLayerGroupRef.current = leaflet.layerGroup().addTo(map);

      // Tıklama olayları
      map.on("click", async (e) => {
        const currentMode = modeRef.current;
        const { lat, lng } = e.latlng;

        if (currentMode === "point") {
          const icon = createCustomMarkerIcon(leaflet, selectedIconRef.current, selectedColorRef.current);
          if (pointMarkerRef.current) {
            pointMarkerRef.current.setLatLng([lat, lng]);
            pointMarkerRef.current.setIcon(icon);
          } else {
            pointMarkerRef.current = leaflet.marker([lat, lng], { icon }).addTo(map);
          }
          setSelectedPoint({ lat, lng });
        } else if (currentMode === "building") {
          // Akıllı bina tespiti
          setIsDetectingBuilding(true);
          setDetectedBuildingInfo("Bina geometrisi taranıyor...");
          try {
            const res = await detectBuildingAtCoordinateAction(lat, lng);
            if (res.success && res.building) {
              setPolygonPoints(res.building.polygon);
              setDetectedBuildingInfo(
                `🏢 ${res.building.name} seçildi (${res.building.polygon.length} köşe - ${formatArea(res.building.areaSquareMeters)})`,
              );
            } else {
              setDetectedBuildingInfo(res.message || "Tıklanan noktada bina yapısı bulunamadı.");
            }
          } catch {
            setDetectedBuildingInfo("Bina tespit servisine ulaşılamadı.");
          } finally {
            setIsDetectingBuilding(false);
          }
        } else if (currentMode === "polygon") {
          setPolygonPoints((prev) => [...prev, { lat, lng }]);
        } else if (currentMode === "linestring") {
          setLinePoints((prev) => [...prev, { lat, lng }]);
        }
      });

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

  // Nokta, ikon veya renk değiştiğinde haritada güncelle
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    async function syncPoint() {
      const leaflet = (await import("leaflet")).default;
      if (selectedPoint) {
        const icon = createCustomMarkerIcon(leaflet, selectedIcon, selectedColor);
        if (pointMarkerRef.current) {
          pointMarkerRef.current.setLatLng([selectedPoint.lat, selectedPoint.lng]);
          pointMarkerRef.current.setIcon(icon);
        } else {
          pointMarkerRef.current = leaflet
            .marker([selectedPoint.lat, selectedPoint.lng], { icon })
            .addTo(map);
        }
      }
    }
    void syncPoint();
  }, [selectedPoint, selectedIcon, selectedColor]);

  // Poligon / Bina noktaları değiştiğinde haritada güncelle
  useEffect(() => {
    if (!mapRef.current || !polygonLayerGroupRef.current) return;
    const group = polygonLayerGroupRef.current;

    async function syncPolygon() {
      const leaflet = (await import("leaflet")).default;
      group.clearLayers();

      if (polygonPoints.length === 0) return;

      const isBuilding = mode === "building";

      polygonPoints.forEach((pt, idx) => {
        leaflet
          .circleMarker([pt.lat, pt.lng], {
            radius: idx === 0 ? 7 : 5,
            color: idx === 0 ? "#16a34a" : isBuilding ? "#7c3aed" : "#e11d48",
            fillColor: idx === 0 ? "#22c55e" : isBuilding ? "#a855f7" : "#f43f5e",
            fillOpacity: 1,
            weight: 2,
          })
          .bindTooltip(`Köşe ${idx + 1}`, { direction: "top", offset: [0, -6] })
          .addTo(group);
      });

      const latlngs = polygonPoints.map((p) => [p.lat, p.lng] as [number, number]);
      if (polygonPoints.length >= 3) {
        leaflet
          .polygon(latlngs, {
            color: isBuilding ? "#7c3aed" : "#e11d48",
            fillColor: isBuilding ? "#a855f7" : "#f43f5e",
            fillOpacity: isBuilding ? 0.38 : 0.25,
            weight: isBuilding ? 3.5 : 2.5,
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
  }, [polygonPoints, mode]);

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
      const iconDef = MARKER_ICONS[selectedIcon] ?? MARKER_ICONS.pin;
      const colorDef = MARKER_COLORS[selectedColor] ?? MARKER_COLORS.red;

      const geoJson = {
        type: "Point",
        coordinates: [selectedPoint.lng, selectedPoint.lat],
        icon: selectedIcon,
        color: colorDef.hex,
        iconLabel: iconDef.label,
      };

      onSelect(
        JSON.stringify(geoJson),
        `${iconDef.emoji} ${iconDef.label} (${selectedPoint.lat.toFixed(4)}, ${selectedPoint.lng.toFixed(4)})`,
      );
    } else if ((mode === "polygon" || mode === "building") && polygonPoints.length >= 3) {
      const closed = [...polygonPoints.map((p) => [p.lng, p.lat]), [polygonPoints[0].lng, polygonPoints[0].lat]];
      const geoJson = {
        type: "Polygon",
        coordinates: [closed],
      };
      const area = calculatePolygonArea(polygonPoints);
      const prefix = mode === "building" ? "🏢 Bina Oturumu" : "📐 Poligon";
      onSelect(JSON.stringify(geoJson), `${prefix} (${polygonPoints.length} köşe - ${formatArea(area)})`);
    } else if (mode === "linestring" && linePoints.length >= 2) {
      const geoJson = {
        type: "LineString",
        coordinates: linePoints.map((p) => [p.lng, p.lat]),
      };
      const length = calculatePolylineLength(linePoints);
      onSelect(JSON.stringify(geoJson), `📏 Çizgi / Hat (${linePoints.length} nokta - ${formatLength(length)})`);
    } else if (mode === "cbs" && selectedCbsEntity) {
      const ref = {
        type: "EntityRef",
        entityId: selectedCbsEntity.id,
        name: selectedCbsEntity.name,
        entityType: selectedCbsEntity.entityType,
        geoJson: selectedCbsEntity.geoJson,
      };
      onSelect(JSON.stringify(ref), `🏛️ CBS: ${selectedCbsEntity.name} (${selectedCbsEntity.entityType})`);
    }
    onClose();
  }

  const polygonArea = calculatePolygonArea(polygonPoints);
  const lineLength = calculatePolylineLength(linePoints);

  const canConfirm =
    (mode === "point" && selectedPoint !== null) ||
    ((mode === "polygon" || mode === "building") && polygonPoints.length >= 3) ||
    (mode === "linestring" && linePoints.length >= 2) ||
    (mode === "cbs" && selectedCbsEntity !== null);

  const currentIconDef = MARKER_ICONS[selectedIcon] ?? MARKER_ICONS.pin;
  const currentColorDef = MARKER_COLORS[selectedColor] ?? MARKER_COLORS.red;

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
        {/* Modal Başlığı */}
        <div className="border-b border-border bg-card/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shapes className="size-5 text-primary" />
              <div>
                <DialogTitle className="text-base font-semibold">
                  Harita & Coğrafi Varlık Seçici
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Renkli ikonlu nokta, tıklanan binanın tamamını seçme, serbest poligon veya CBS katmanından varlık seçin.
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
                Nokta (Renkli İkon)
              </button>

              <button
                type="button"
                onClick={() => setMode("building")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
                  mode === "building"
                    ? "bg-background text-purple-600 dark:text-purple-400 shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Building2 className="size-3.5 text-purple-600" />
                Binayı Seç (Akıllı)
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
                Poligon (Elle Çizim)
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
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setShowIconPicker((prev) => !prev)}
                    className="gap-1.5 text-xs font-medium border-border/80 shadow-xs"
                  >
                    <span
                      className="size-3 rounded-full border border-white shadow-xs"
                      style={{ backgroundColor: currentColorDef.hex }}
                    />
                    <span>{currentIconDef.emoji} {currentIconDef.label}</span>
                    <ChevronDown className="size-3 text-muted-foreground" />
                  </Button>

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
                </>
              )}

              {mode === "building" && (
                <div className="flex items-center gap-2">
                  {isDetectingBuilding && (
                    <span className="flex items-center gap-1 rounded bg-purple-500/10 px-2 py-0.5 font-medium text-purple-600 animate-pulse">
                      <Loader2 className="size-3 animate-spin" />
                      Bina Taranıyor...
                    </span>
                  )}
                  {polygonPoints.length > 0 && !isDetectingBuilding && (
                    <span className="rounded bg-purple-500/15 px-2 py-0.5 font-semibold text-purple-700 dark:text-purple-300">
                      Bina Oturumu: {polygonPoints.length} Köşe | Alan: {formatArea(polygonArea)}
                    </span>
                  )}
                  {polygonPoints.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setPolygonPoints([]);
                        setDetectedBuildingInfo(null);
                      }}
                      title="Bina seçimini temizle"
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                      Temizle
                    </Button>
                  )}
                </div>
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

        {/* İkon ve Renk Seçim Paneli (Nokta modunda açılır) */}
        {mode === "point" && showIconPicker && (
          <div className="border-b border-border bg-background/95 p-3.5 backdrop-blur-xs transition-all animate-in fade-in-0 duration-150">
            <div className="flex flex-col gap-3 max-w-4xl">
              {/* Renk Seçenekleri Çubuğu */}
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Paintbrush className="size-3.5 text-primary" />
                    Simge Rengi Seç:
                  </span>
                  <div className="flex items-center gap-1.5 ml-1">
                    {(Object.keys(MARKER_COLORS) as MarkerColorType[]).map((colorKey) => {
                      const colorDef = MARKER_COLORS[colorKey];
                      const isSelected = selectedColor === colorKey;
                      return (
                        <button
                          key={colorKey}
                          type="button"
                          onClick={() => setSelectedColor(colorKey)}
                          title={colorDef.name}
                          className={cn(
                            "size-6 rounded-full transition-all flex items-center justify-center border border-white/60",
                            isSelected ? "scale-115 ring-2 ring-foreground shadow-md" : "opacity-80 hover:opacity-100 hover:scale-105",
                          )}
                          style={{ backgroundColor: colorDef.hex }}
                        >
                          {isSelected && <Check className="size-3 text-white stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                  <span className="ml-2 font-medium text-muted-foreground">
                    ({currentColorDef.name})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowIconPicker(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Paneli Kapat
                </button>
              </div>

              {/* İkon Seçenekleri Grid'i (Seçilen renge göre dinamik renkli önizleme) */}
              <div>
                <div className="mb-2 text-[11px] font-semibold text-muted-foreground">
                  Simge / Taşınmaz Türü (Seçili renkle önizleme):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(Object.keys(MARKER_ICONS) as MarkerIconType[]).map((iconKey) => {
                    const iconDef = MARKER_ICONS[iconKey];
                    const isSelected = selectedIcon === iconKey;
                    return (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setSelectedIcon(iconKey)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border p-2 text-left text-xs transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 font-semibold text-primary shadow-xs ring-1 ring-primary/40"
                            : "border-border/70 hover:bg-muted/60 text-foreground",
                        )}
                      >
                        {/* Seçilen renkle boyanmış mini rozet simgesi */}
                        <div
                          className="size-7 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs border border-white"
                          style={{ backgroundColor: currentColorDef.hex }}
                          dangerouslySetInnerHTML={{ __html: iconDef.svg }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium">{iconDef.label}</span>
                          <span className="text-[10px] text-muted-foreground">{iconDef.emoji}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CBS Varlık Arama Paneli */}
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
              <span>
                Haritaya tıklayarak <strong>{currentIconDef.label}</strong> simgesini istediğiniz konuma bırakın.
              </span>
            )}
            {mode === "building" && (
              <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-medium">
                <Sparkles className="size-3.5 text-purple-600" />
                {detectedBuildingInfo ||
                  "Haritada herhangi bir binanın üzerine tıklayın; binanın tüm sınırları otomatik seçilecektir."}
              </span>
            )}
            {mode === "polygon" && (
              <span>
                Haritaya tıklayarak köşe noktaları ekleyin (en az 3 köşe).
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
                Seçilen Simge & Konum:{" "}
                <strong className="text-foreground">
                  {currentIconDef.emoji} {currentIconDef.label} ({selectedPoint.lat.toFixed(6)}, {selectedPoint.lng.toFixed(6)})
                </strong>
              </span>
            )}
            {(mode === "polygon" || mode === "building") && polygonPoints.length >= 3 && (
              <span className="text-muted-foreground">
                Seçilen Alan:{" "}
                <strong className="text-foreground">
                  {mode === "building" ? "🏢 Bina Oturumu" : "📐 Poligon"} ({polygonPoints.length} Köşe - {formatArea(polygonArea)})
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
