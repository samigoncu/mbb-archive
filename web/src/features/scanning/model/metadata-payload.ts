import type { MetadataSchemaDetail } from "@/features/classification/model/classification";

/** Çok seçimli alanlarda form değerlerini ayıran karakter. */
export const multiChoiceSeparator = "|";

/**
 * Formdaki metin değerlerini şemanın beklediği JSON tiplerine çevirir; backend
 * doğrulaması tip uyuşmazlığını reddettiği için dönüşüm burada yapılır. Boş
 * bırakılan zorunlu olmayan alanlar hiç gönderilmez.
 */
export function buildMetadataPayload(
  schema: MetadataSchemaDetail,
  raw: Record<string, string>,
): { values: Record<string, unknown>; error?: string } {
  const values: Record<string, unknown> = {};

  for (const field of schema.fields) {
    const input = (raw[field.key] ?? "").trim();

    if (input.length === 0) {
      if (field.isRequired) {
        return { values, error: `'${field.label}' alanı zorunludur.` };
      }
      continue;
    }

    switch (field.fieldType) {
      case "Integer": {
        const parsed = Number(input);
        if (!Number.isInteger(parsed)) {
          return { values, error: `'${field.label}' tam sayı olmalıdır.` };
        }
        values[field.key] = parsed;
        break;
      }
      case "Decimal": {
        const parsed = Number(input);
        if (Number.isNaN(parsed)) {
          return { values, error: `'${field.label}' sayı olmalıdır.` };
        }
        values[field.key] = parsed;
        break;
      }
      case "Boolean":
        values[field.key] = input === "true";
        break;
      case "DateTime":
        values[field.key] = new Date(input).toISOString();
        break;
      case "MultiChoice":
        values[field.key] = input.split(multiChoiceSeparator).filter(Boolean);
        break;
      case "Json":
        try {
          values[field.key] = JSON.parse(input);
        } catch {
          return { values, error: `'${field.label}' geçerli JSON olmalıdır.` };
        }
        break;
      case "GeoPoint": {
        if (input.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(input);
            values[field.key] = parsed;
            break;
          } catch {
            return {
              values,
              error: `'${field.label}' geçerli bir nokta geometrisi veya koordinat olmalıdır.`,
            };
          }
        }
        const parts = input.split(",").map((p) => p.trim());
        if (parts.length !== 2) {
          return {
            values,
            error: `'${field.label}' geçerli bir koordinat olmalıdır (Örn: 38.3552, 38.3095).`,
          };
        }
        const lat = Number(parts[0]);
        const lng = Number(parts[1]);
        if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          return {
            values,
            error: `'${field.label}' geçerli bir enlem (-90..90) ve boylam (-180..180) olmalıdır.`,
          };
        }
        values[field.key] = `${lat}, ${lng}`;
        break;
      }
      case "GeoPolygon": {
        try {
          const parsed = JSON.parse(input);
          values[field.key] = parsed;
        } catch {
          return {
            values,
            error: `'${field.label}' geçerli bir poligon geometrisi (GeoJSON) olmalıdır.`,
          };
        }
        break;
      }
      case "GeoGeometry": {
        if (input.trim().startsWith("{")) {
          try {
            values[field.key] = JSON.parse(input);
          } catch {
            return {
              values,
              error: `'${field.label}' geçerli bir coğrafi geometri (GeoJSON) olmalıdır.`,
            };
          }
        } else {
          // Nokta koordinatı olabilir
          const parts = input.split(",").map((p) => p.trim());
          if (parts.length === 2) {
            const lat = Number(parts[0]);
            const lng = Number(parts[1]);
            if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
              values[field.key] = `${lat}, ${lng}`;
              break;
            }
          }
          values[field.key] = input;
        }
        break;
      }
      default:
        // Text, TextArea, Choice ve Date string olarak gönderilir.
        values[field.key] = input;
    }
  }

  return { values };
}
