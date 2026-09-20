import type { SearchCondition } from "./search";
import type { MetadataSchemaDetail } from "@/features/classification/model/classification";

export const operatorLabels = {
  contains: "İçerir",
  notContains: "İçermez",
  equals: "Eşittir",
  notEquals: "Eşit değildir",
};

export function operatorsFor(field: string): SearchCondition["operator"][] {
  if (field === "keyword") return ["contains", "notContains"];
  if (field === "mimeType" || field === "filePlanCode")
    return ["equals", "notEquals"];
  return ["contains", "notContains", "equals", "notEquals"];
}

export function searchableFields(schemas: MetadataSchemaDetail[]) {
  return Array.from(
    new Map(
      schemas.flatMap((schema) =>
        schema.fields
          .filter((field) => field.isSearchable)
          .map(
            (field) =>
              [
                `metadata:${schema.key}.${field.key}`,
                {
                  key: `metadata:${schema.key}.${field.key}`,
                  label: `${schema.name} / ${field.label}`,
                },
              ] as const,
          ),
      ),
    ).values(),
  );
}

export function parseConditions(raw: string): {
  conditions: SearchCondition[];
  error?: string;
} {
  if (!raw) return { conditions: [] };
  try {
    if (raw.length > 8000) throw new Error();
    const values: unknown = JSON.parse(raw);
    if (!Array.isArray(values) || values.length > 10) throw new Error();
    const conditions = values.map((value): SearchCondition => {
      if (!value || typeof value !== "object") throw new Error();
      const { field, operator, value: text } = value;
      if (
        typeof field !== "string" ||
        field.length > 160 ||
        !(
          ["keyword", "title", "mimeType", "filePlanCode"].includes(field) ||
          /^metadata:[\p{L}\p{N}_.-]+$/u.test(field)
        ) ||
        !operatorsFor(field).includes(operator) ||
        typeof text !== "string" ||
        !text.trim() ||
        text.length > 500
      )
        throw new Error();
      return { field, operator, value: text };
    });
    return { conditions };
  } catch {
    return {
      conditions: [],
      error:
        "Arama bağlantısındaki koşullar geçersiz. Filtreleri sıfırlayıp yeniden oluşturun.",
    };
  }
}
