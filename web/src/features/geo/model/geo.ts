export type GeoEntitySummary = {
  id: string;
  provider: string;
  layerName: string;
  featureId: string;
  entityType: string;
  name: string;
  externalReference: string | null;
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
  relatedDocumentCount: number;
};

export type GeoEntityDetails = {
  id: string;
  provider: string;
  layerName: string;
  featureId: string;
  entityType: string;
  name: string;
  geoJson: string;
  propertiesJson: string | null;
  externalReference: string | null;
  createdAt: string;
};

export type GeoRelationDetails = {
  id: string;
  documentId: string;
  geoEntityId: string;
  geoEntityName: string;
  geoEntityType: string;
  layerName: string;
  relationType: string;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
};

export type GeoRelatedDocument = {
  documentId: string;
  relationId: string;
  relationType: string;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
};

export type GeoMapSettings = {
  tileUrl: string;
  attribution: string;
  centerLatitude: number;
  centerLongitude: number;
  zoom: number;
  isBasemapConfigured: boolean;
  isProviderConfigured: boolean;
};

export const geoEntityTypeLabels: Record<string, string> = {
  Province: "İl",
  District: "İlçe",
  Neighborhood: "Mahalle",
  Road: "Yol",
  Street: "Sokak",
  Junction: "Kavşak",
  Parcel: "Parsel",
  Building: "Yapı",
  Facility: "Tesis",
  Park: "Park",
  BusStop: "Durak",
  Route: "Güzergâh",
  ProjectArea: "Proje Alanı",
  CustomGeometry: "Özel Geometri",
};

export const geoRelationTypeLabels: Record<string, string> = {
  Subject: "Konusu",
  Mentions: "Adı geçiyor",
  AffectedArea: "Etki alanı",
  Location: "Düzenlendiği yer",
};
