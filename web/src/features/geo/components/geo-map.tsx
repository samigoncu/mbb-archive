"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useId, useRef } from "react";
import type { GeoEntityDetails, GeoMapSettings } from "@/features/geo/model/geo";
import type { WmsMapLayer } from "@/features/geo/model/geo-admin";

/** Varlık türüne göre çizim rengi; renk tek başına anlam taşımaz, listede ad da yazar. */
/** Sunucudan gelen metin doğrudan DOM'a yazılmaz. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

const strokeByType: Record<string, string> = {
  Road: "#0284c7",
  Street: "#0ea5e9",
  Junction: "#c026d3",
  District: "#16a34a",
  Neighborhood: "#65a30d",
  Parcel: "#ca8a04",
  Building: "#dc2626",
  Facility: "#ea580c",
  Park: "#15803d",
  Route: "#7c3aed",
  ProjectArea: "#0891b2",
};

export type GeoMapFeature = {
  id: string;
  name: string;
  entityType: string;
  geoJson: string;
};

/**
 * Leaflet haritası. Altlık adresi yapılandırılmadıysa hiçbir dış servise
 * istek atılmaz; geometriler nötr zemin üzerine çizilir ve eksik yapılandırma
 * ayrıca bildirilir (§9: servis adresleri environment'tan gelir).
 */
export function GeoMap({
  settings,
  features,
  wmsLayers = [],
  selectedId,
  onSelect,
  className,
}: {
  settings: GeoMapSettings;
  /** Yönetim ekranından tanımlanan WMS bindirmeleri. */
  wmsLayers?: WmsMapLayer[];
  features: GeoMapFeature[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const containerId = useId().replace(/:/g, "");
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const selectRef = useRef(onSelect);

  selectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const leaflet = (await import("leaflet")).default;

      if (cancelled || mapRef.current) return;

      const map = leaflet.map(containerId, { attributionControl: true }).setView(
        [settings.centerLatitude, settings.centerLongitude],
        settings.zoom,
      );

      // Harita altlıkları: Standart, Uydu, Topoğrafya, Açık/Koyu temalar ve tanımlıysa Kurumsal altlık
      const baseMaps: Record<string, import("leaflet").Layer> = {};

      if (settings.isBasemapConfigured && settings.tileUrl) {
        const corporate = leaflet.tileLayer(settings.tileUrl, {
          attribution: settings.attribution || "Kurumsal Harita",
          maxZoom: 19,
        });
        baseMaps["Kurumsal Altlık"] = corporate;
        corporate.addTo(map);
      }

      const osm = leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
        maxZoom: 19,
      });
      baseMaps["Standart (OSM)"] = osm;

      const satellite = leaflet.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri &mdash; Kaynak: Esri, Maxar, Earthstar Geographics",
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

      const dark = leaflet.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 20,
        subdomains: "abcd",
      });
      baseMaps["Koyu Tema (CartoDB)"] = dark;

      const none = leaflet.layerGroup();
      baseMaps["Altlıksız (Nötr)"] = none;

      // Kurumsal altlık tanımlı değilse Standart OSM varsayılan olarak seçilir
      if (!settings.isBasemapConfigured || !settings.tileUrl) {
        osm.addTo(map);
      }

      // WMS bindirmeleri vekil uç üzerinden çizilir: adres ve kimlik sunucuda
      // kalır, Leaflet yalnız OGC parametrelerini ekler.
      const overlays: Record<string, import("leaflet").Layer> = {};

      if (wmsLayers.length > 0) {
        for (const layer of wmsLayers) {
          const overlay = leaflet.tileLayer.wms(`/api/geo/wms/${layer.serviceId}`, {
            layers: layer.layerName,
            format: layer.imageFormat,
            transparent: true,
            opacity: layer.opacityPercent / 100,
          });

          overlays[`${layer.title} · ${layer.serviceTitle}`] = overlay;
          if (layer.visibleByDefault) overlay.addTo(map);
        }

        // Sorgulanabilir ve o an görünür katmanlar için GetFeatureInfo.
        map.on("click", async event => {
          const active = wmsLayers.filter(
            layer => layer.isQueryable && map.hasLayer(overlays[`${layer.title} · ${layer.serviceTitle}`]),
          );
          if (active.length === 0) return;

          const size = map.getSize();
          const bounds = map.getBounds();
          const point = map.latLngToContainerPoint(event.latlng);
          const popup = leaflet.popup({ maxWidth: 360 })
            .setLatLng(event.latlng)
            .setContent("Sorgulanıyor…")
            .openOn(map);

          const sections: string[] = [];

          for (const layer of active) {
            // WMS 1.3.0'da eksen sırası CRS'e bağlıdır; EPSG:4326 için
            // enlem/boylam beklenir, bu yüzden bbox buna göre kurulur.
            const parameters = new URLSearchParams({
              service: "WMS",
              version: "1.3.0",
              request: "GetFeatureInfo",
              layers: layer.layerName,
              query_layers: layer.layerName,
              crs: "EPSG:4326",
              bbox: [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()].join(","),
              width: String(size.x),
              height: String(size.y),
              i: String(Math.round(point.x)),
              j: String(Math.round(point.y)),
              info_format: "text/plain",
              feature_count: "5",
            });

            try {
              const response = await fetch(`/api/geo/wms/${layer.serviceId}?${parameters}`);
              if (!response.ok) continue;
              const text = (await response.text()).trim();
              if (text.length > 0) sections.push(`<strong>${layer.title}</strong><pre class="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs">${escapeHtml(text)}</pre>`);
            } catch {
              // Tek katmanın başarısızlığı diğerlerini engellemez.
            }
          }

          popup.setContent(sections.length > 0 ? sections.join("<hr class=\"my-2\" />") : "Bu noktada öznitelik bulunamadı.");
        });
      }

      leaflet.control.layers(baseMaps, overlays, { collapsed: true, position: "topright" }).addTo(map);

      mapRef.current = map;
      layerRef.current = leaflet.layerGroup().addTo(map);
    }

    void setup();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // Harita bir kez kurulur; ayarlar sunucudan gelir ve oturum içinde değişmez.
  }, [containerId, settings, wmsLayers]);

  useEffect(() => {
    let cancelled = false;

    async function draw() {
      const leaflet = (await import("leaflet")).default;
      const layers = layerRef.current;
      const map = mapRef.current;

      if (cancelled || !layers || !map) return;

      layers.clearLayers();

      const bounds = leaflet.latLngBounds([]);

      for (const feature of features) {
        let geometry: unknown;

        try {
          geometry = JSON.parse(feature.geoJson);
        } catch {
          // Bozuk geometri haritayı düşürmez; o nesne çizilmez.
          continue;
        }

        const isSelected = feature.id === selectedId;
        const color = strokeByType[feature.entityType] ?? "#475569";

        const layer = leaflet.geoJSON(geometry as never, {
          style: {
            color,
            weight: isSelected ? 6 : 3,
            opacity: isSelected ? 1 : 0.75,
            fillOpacity: isSelected ? 0.25 : 0.12,
          },
          pointToLayer: (_point, latlng) =>
            leaflet.circleMarker(latlng, {
              radius: isSelected ? 9 : 6,
              color,
              weight: isSelected ? 4 : 2,
              fillOpacity: 0.7,
            }),
        });

        layer.bindTooltip(feature.name, { direction: "top" });
        layer.on("click", () => selectRef.current?.(feature.id));
        layer.addTo(layers);

        bounds.extend(layer.getBounds());
      }

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
      }
    }

    void draw();

    return () => {
      cancelled = true;
    };
  }, [features, selectedId]);

  return (
    <div
      id={containerId}
      role="application"
      aria-label="Kurumsal harita"
      className={className}
    />
  );
}

export function toMapFeature(entity: GeoEntityDetails): GeoMapFeature {
  return {
    id: entity.id,
    name: entity.name,
    entityType: entity.entityType,
    geoJson: entity.geoJson,
  };
}
