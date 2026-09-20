"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { operatorLabels, operatorsFor } from "../model/conditions";
import type { SearchCondition } from "../model/search";

const selectClass =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export function SearchConditionEditor({
  conditions,
  onChange,
  fields,
  compact,
}: {
  conditions: SearchCondition[];
  onChange: (conditions: SearchCondition[]) => void;
  fields: { key: string; label: string }[];
  compact: boolean;
}) {
  function update(index: number, patch: Partial<SearchCondition>) {
    onChange(
      conditions.map((condition, i) =>
        i === index ? { ...condition, ...patch } : condition,
      ),
    );
  }
  return (
    <div className="space-y-4">
      {conditions.map((condition, index) => (
        <div key={index} className="space-y-3">
          {index > 0 && (
            <div className="flex items-center gap-3 text-[10px] font-semibold tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              VE
              <span className="h-px flex-1 bg-border" />
            </div>
          )}
          <fieldset
            className={
              compact
                ? "space-y-3 rounded-xl border border-border bg-background/70 p-3"
                : "grid grid-cols-1 items-end gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-[1.2fr_.8fr_1.5fr_auto]"
            }
          >
            <legend className="sr-only">Koşul {index + 1}</legend>
            <label className="block space-y-2 text-xs font-medium">
              Alan
              <select
                aria-label={`Koşul ${index + 1} alanı`}
                value={condition.field}
                className={selectClass}
                onChange={(event) => {
                  const field = event.target.value;
                  update(index, { field, operator: operatorsFor(field)[0] });
                }}
              >
                {fields.map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
                {!fields.some((field) => field.key === condition.field) && (
                  <option value={condition.field}>{condition.field}</option>
                )}
              </select>
            </label>
            <label className="block space-y-2 text-xs font-medium">
              Koşul
              <select
                aria-label={`Koşul ${index + 1} işleci`}
                value={condition.operator}
                className={selectClass}
                onChange={(event) =>
                  update(index, {
                    operator: event.target.value as SearchCondition["operator"],
                  })
                }
              >
                {operatorsFor(condition.field).map((operator) => (
                  <option key={operator} value={operator}>
                    {operatorLabels[operator]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2 text-xs font-medium">
              Değer
              <Input
                aria-label={`Koşul ${index + 1} değeri`}
                required
                maxLength={500}
                value={condition.value}
                onChange={(event) =>
                  update(index, { value: event.target.value })
                }
                placeholder="Aranacak değeri yazın"
                className="h-11"
              />
            </label>
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-destructive"
              aria-label={`Koşul ${index + 1} kaldır`}
              onClick={() => onChange(conditions.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4" />
              {compact && "Kaldır"}
            </Button>
          </fieldset>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="rounded-full px-4"
        disabled={conditions.length >= 10}
        onClick={() =>
          onChange([
            ...conditions,
            {
              field:
                fields.find((field) => field.key.startsWith("metadata:"))
                  ?.key ?? "title",
              operator: "contains",
              value: "",
            },
          ])
        }
      >
        <Plus className="size-4" />
        Filtre ekle
      </Button>
      {conditions.length >= 10 && (
        <p className="text-xs text-muted-foreground">
          En fazla 10 koşul eklenebilir.
        </p>
      )}
    </div>
  );
}
