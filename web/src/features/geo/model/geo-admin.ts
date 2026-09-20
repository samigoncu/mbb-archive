export type GeoServiceKind = "Wfs" | "Wms";

export type GeoLayerView = {
  id: string;
  layerName: string;
  title: string;
  entityType: string;
  nameAttribute: string;
  visibleByDefault: boolean;
  opacityPercent: number;
  imageFormat: string | null;
  isQueryable: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type GeoServiceView = {
  id: string;
  kind: GeoServiceKind;
  title: string;
  baseUrl: string;
  userName: string | null;
  /** Parolanın kendisi hiçbir zaman gelmez; yalnız tanımlı olup olmadığı. */
  hasPassword: boolean;
  timeoutSeconds: number;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string | null;
  updatedBy: string;
  layers: GeoLayerView[];
};

export type GeoBasemapView = {
  tileUrl: string;
  attribution: string;
  centerLatitude: number;
  centerLongitude: number;
  zoom: number;
  version: number;
  updatedAt: string | null;
  updatedBy: string;
};

export type GeoConfiguration = {
  basemap: GeoBasemapView;
  services: GeoServiceView[];
};

export type DiscoveredLayer = {
  layerName: string;
  title: string;
  abstract: string | null;
  isQueryable: boolean;
  alreadyAdded: boolean;
};

/** Haritanın çizeceği WMS katmanı; adres ve kimlik sunucuda kalır. */
export type WmsMapLayer = {
  serviceId: string;
  serviceTitle: string;
  layerId: string;
  layerName: string;
  title: string;
  visibleByDefault: boolean;
  opacityPercent: number;
  imageFormat: string;
  isQueryable: boolean;
};

export const geoServiceKindLabels: Record<GeoServiceKind, string> = {
  Wfs: "WFS — öznitelik sorgusu",
  Wms: "WMS — harita görüntüsü",
};

/**
 * WFS katmanı bir varlık türüne eşlenir; arama ve içe aktarma bu türü kullanır.
 * Liste `GeoEntityType` ile aynı olmalı.
 */
export const geoEntityTypes = [
  "Province", "District", "Neighborhood", "Street", "Road", "Junction",
  "Parcel", "Building", "Facility", "Park", "Route", "ProjectArea", "CustomGeometry",
] as const;
