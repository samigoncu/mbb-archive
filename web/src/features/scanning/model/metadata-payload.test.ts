import { describe, expect, it } from "vitest";

import type {
  MetadataFieldDefinition,
  MetadataSchemaDetail,
} from "@/features/classification/model/classification";

import { buildMetadataPayload } from "./metadata-payload";

function field(
  overrides: Partial<MetadataFieldDefinition> &
    Pick<MetadataFieldDefinition, "key" | "label" | "fieldType">,
): MetadataFieldDefinition {
  return {
    id: overrides.key,
    isRequired: false,
    isSearchable: true,
    isRepeatable: false,
    optionsJson: null,
    ...overrides,
  };
}

function schema(fields: MetadataFieldDefinition[]): MetadataSchemaDetail {
  return {
    id: "01a06586-0000-7000-8000-000000000001",
    key: "evrak-ustverisi",
    name: "Evrak Üstverisi",
    version: 1,
    status: "Published",
    fields,
  };
}

describe("buildMetadataPayload", () => {
  it("rejects a blank required field with the field label", () => {
    const result = buildMetadataPayload(
      schema([
        field({ key: "evrak_no", label: "Evrak No", fieldType: "Text", isRequired: true }),
      ]),
      { evrak_no: "   " },
    );

    expect(result.error).toBe("'Evrak No' alanı zorunludur.");
  });

  it("omits blank optional fields instead of sending empty strings", () => {
    const result = buildMetadataPayload(
      schema([field({ key: "muhatap", label: "Muhatap", fieldType: "Text" })]),
      { muhatap: "" },
    );

    expect(result.error).toBeUndefined();
    expect(result.values).toEqual({});
  });

  it("converts integers and rejects non-integer input", () => {
    const definition = schema([
      field({ key: "sicil_no", label: "Sicil No", fieldType: "Integer" }),
    ]);

    expect(buildMetadataPayload(definition, { sicil_no: "42" }).values).toEqual({
      sicil_no: 42,
    });

    expect(buildMetadataPayload(definition, { sicil_no: "42.5" }).error).toBe(
      "'Sicil No' tam sayı olmalıdır.",
    );
  });

  it("splits multi-choice values and drops empty segments", () => {
    const result = buildMetadataPayload(
      schema([field({ key: "etiket", label: "Etiket", fieldType: "MultiChoice" })]),
      { etiket: "ukome||hal-yolu" },
    );

    expect(result.values).toEqual({ etiket: ["ukome", "hal-yolu"] });
  });

  it("rejects malformed JSON rather than sending a raw string", () => {
    const result = buildMetadataPayload(
      schema([field({ key: "ek", label: "Ek", fieldType: "Json" })]),
      { ek: "{bozuk" },
    );

    expect(result.error).toBe("'Ek' geçerli JSON olmalıdır.");
    expect(result.values).toEqual({});
  });

  it("keeps text-like types as trimmed strings", () => {
    const result = buildMetadataPayload(
      schema([
        field({ key: "konu", label: "Konu", fieldType: "Text" }),
        field({ key: "evrak_tarihi", label: "Evrak Tarihi", fieldType: "Date" }),
      ]),
      { konu: "  Hal Yolu  ", evrak_tarihi: "2026-09-04" },
    );

    expect(result.values).toEqual({
      konu: "Hal Yolu",
      evrak_tarihi: "2026-09-04",
    });
  });

  it("validates and normalizes GeoPoint coordinates", () => {
    const definition = schema([
      field({ key: "konum", label: "Konum", fieldType: "GeoPoint" }),
    ]);

    expect(buildMetadataPayload(definition, { konum: "38.3552, 38.3095" }).values).toEqual({
      konum: "38.3552, 38.3095",
    });

    expect(buildMetadataPayload(definition, { konum: "gecersiz,koordinat" }).error).toBe(
      "'Konum' geçerli bir enlem (-90..90) ve boylam (-180..180) olmalıdır.",
    );

    expect(buildMetadataPayload(definition, { konum: "150, 38.3095" }).error).toBe(
      "'Konum' geçerli bir enlem (-90..90) ve boylam (-180..180) olmalıdır.",
    );
  });

  it("validates and normalizes GeoPolygon", () => {
    const definition = schema([
      field({ key: "parsel_alani", label: "Parsel Alanı", fieldType: "GeoPolygon" }),
    ]);

    const polygonJson = JSON.stringify({
      type: "Polygon",
      coordinates: [[[38.3, 38.35], [38.31, 38.35], [38.31, 38.36], [38.3, 38.36], [38.3, 38.35]]],
    });

    const result = buildMetadataPayload(definition, { parsel_alani: polygonJson });
    expect(result.values?.parsel_alani).toEqual(JSON.parse(polygonJson));

    expect(buildMetadataPayload(definition, { parsel_alani: "not a json" }).error).toBe(
      "'Parsel Alanı' geçerli bir poligon geometrisi (GeoJSON) olmalıdır.",
    );
  });

  it("validates and normalizes GeoGeometry", () => {
    const definition = schema([
      field({ key: "geometri", label: "Geometri", fieldType: "GeoGeometry" }),
    ]);

    expect(buildMetadataPayload(definition, { geometri: "38.3552, 38.3095" }).values).toEqual({
      geometri: "38.3552, 38.3095",
    });

    const featureJson = JSON.stringify({
      type: "LineString",
      coordinates: [[38.3, 38.35], [38.31, 38.36]],
    });
    expect(buildMetadataPayload(definition, { geometri: featureJson }).values?.geometri).toEqual(
      JSON.parse(featureJson),
    );
  });
});
