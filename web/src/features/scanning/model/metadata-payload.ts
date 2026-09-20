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
      default:
        // Text, TextArea, Choice ve Date string olarak gönderilir.
        values[field.key] = input;
    }
  }

  return { values };
}
