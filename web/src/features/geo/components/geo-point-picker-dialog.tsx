"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useId, useRef, useState } from "react";
import { Check, LocateFixed, MapPin, Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GeoPointPickerDialog({
  isOpen,
  onClose,
  initialCoordinate,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialCoordinate?: string;
  onSelect: (coordinate: string) => void;
}) {
  const containerId = useId().replace(/:/g, "");
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(() => {
    if (!initialCoordinate) return null;
    const parts = initialCoordinate.split(",").map((p) => Number(p.trim()));
    if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
    return null;
  });

  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").CircleMarker | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function initMap() {
      const leaflet = (await import("leaflet")).default;
      if (cancelled) return;

      const defaultLat = selectedPoint?.lat ?? 38.3552;
      const defaultLng = selectedPoint?.lng ?? 38.3095;
      const defaultZoom = selectedPoint ? 16 : 13;

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

      function updateMarker(lat: number, lng: number) {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = leaflet
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
      }

      if (selectedPoint) {
        updateMarker(selectedPoint.lat, selectedPoint.lng);
      }

      map.on("click", (e) => {
        updateMarker(e.latlng.lat, e.latlng.lng);
      });

      // Dialog animasyonu sonrasi Leaflet boyutlarini guncelle
      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 400);

      mapRef.current = map;
    }

    void initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen, containerId]);

  function handleLocateMe() {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedPoint({ lat: latitude, lng: longitude });
        mapRef.current?.setView([latitude, longitude], 17);
        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
        }
      },
      () => {
        // İzin verilmediyse sessiz kal
      },
    );
  }

  function handleConfirm() {
    if (selectedPoint) {
      onSelect(`${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}`);
    }
    onClose();
  }

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
        <div className="flex items-center justify-between border-b border-border p-4 pb-3">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <MapPin className="size-4 text-rose-600" />
              Haritadan Konum / Nokta Seç
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Büfe, çay bahçesi, ATM, reklam panosu veya parselin yerini haritaya tıklayarak işaretleyin.
            </DialogDescription>
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

        <div
          className={cn(
            "relative w-full border-b border-border bg-muted/20",
            isMaximized ? "h-[calc(100vh-140px)]" : "h-[620px] max-h-[70vh] min-h-[460px]",
          )}
        >
          <div id={containerId} className="h-full w-full" tabIndex={0} />

          <button
            type="button"
            onClick={handleLocateMe}
            title="Mevcut GPS Konumuma Git"
            className="absolute bottom-4 left-4 z-[1000] flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-md transition-colors hover:bg-muted"
          >
            <LocateFixed className="size-3.5 text-primary" />
            Konumumu Bul
          </button>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between gap-3 p-3 px-4">
          <div className="text-xs text-muted-foreground">
            {selectedPoint ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-semibold text-foreground">
                <MapPin className="size-3.5 text-rose-600" />
                {selectedPoint.lat.toFixed(6)}, {selectedPoint.lng.toFixed(6)}
              </span>
            ) : (
              <span>İşaretlemek için haritada bir noktaya tıklayın.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              <X className="size-3.5" />
              Vazgeç
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!selectedPoint}
              onClick={handleConfirm}
              className="gap-1.5"
            >
              <Check className="size-3.5" />
              Bu Konumu Seç
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

