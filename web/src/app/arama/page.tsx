import { SearchX } from "lucide-react";
import { EmptyState, Panel } from "@/components/ui/page";
import { ApiError } from "@/lib/api/api-client";
import { getPublishedMetadataSchemas } from "@/features/classification/api/get-classification";
import {
  searchDocuments,
  searchPageSize,
} from "@/features/search/api/search-documents";
import { SearchFacets } from "@/features/search/components/search-facets";
import { SearchPagination } from "@/features/search/components/search-pagination";
import { SearchResultView } from "@/features/search/components/search-result-view";
import { SearchWorkspace } from "@/features/search/components/search-workspace";
import {
  parseConditions,
  searchableFields,
} from "@/features/search/model/conditions";
import type { SearchCondition } from "@/features/search/model/search";
import { validSearchDate } from "@/features/search/model/search-dates";

export const metadata = { title: "Arama" };
type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export default async function AramaPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = single(params.q);
  const page = Math.max(
    1,
    Number.parseInt(single(params.page) || "1", 10) || 1,
  );
  const mode = single(params.mode) === "advanced" ? "advanced" : "basic";
  const parsed = parseConditions(single(params.conditions));
  const conditions: SearchCondition[] = [...parsed.conditions];
  // Existing bookmarked searches retain their filters in the new editor.
  const mimeType = single(params.mimeType);
  const filePlanCode = single(params.filePlanCode);
  const metadataKey = single(params.metadataKey);
  const metadataValue = single(params.metadataValue);
  if (mimeType)
    conditions.push({ field: "mimeType", operator: "equals", value: mimeType });
  if (filePlanCode)
    conditions.push({
      field: "filePlanCode",
      operator: "equals",
      value: filePlanCode,
    });
  if (metadataKey && metadataValue)
    conditions.push({
      field: `metadata:${metadataKey}`,
      operator: "equals",
      value: metadataValue,
    });
  let error = parsed.error;
  const from = single(params.from);
  const to = single(params.to);
  const rawDateField = single(params.dateField);
  const dateField = rawDateField === "createdAt" ? "createdAt" : "ingestedAt";
  if (
    !validSearchDate(from) ||
    !validSearchDate(to) ||
    (from && to && from > to) ||
    (rawDateField && !["createdAt", "ingestedAt"].includes(rawDateField))
  )
    error =
      "Tarih aralığı geçersiz. Başlangıç ve bitiş tarihlerini kontrol edin.";
  if (
    conditions.length > 10 ||
    q.length > 500 ||
    !!metadataKey !== !!metadataValue
  )
    error =
      "Arama bağlantısındaki filtreleri kontrol edin; en fazla 10 koşul kullanılabilir.";
  const hasSearch = Boolean(q || conditions.length || from || to);
  const activeParams: Record<string, string> = { mode };
  if (from) activeParams.from = from;
  if (to) activeParams.to = to;
  if (from || to) activeParams.dateField = dateField;
  if (q) activeParams.q = q;
  // Keep existing facet parameters separate so they can still be toggled off.
  if (parsed.conditions.length)
    activeParams.conditions = JSON.stringify(parsed.conditions);
  if (mimeType) activeParams.mimeType = mimeType;
  if (filePlanCode) activeParams.filePlanCode = filePlanCode;
  if (metadataKey && metadataValue) {
    activeParams.metadataKey = metadataKey;
    activeParams.metadataValue = metadataValue;
  }

  const [schemaResult, searchResult] = await Promise.allSettled([
    getPublishedMetadataSchemas(),
    hasSearch && !error
      ? searchDocuments({
          q,
          page,
          conditions,
          from: from || undefined,
          to: to || undefined,
          dateField: from || to ? dateField : undefined,
        })
      : Promise.resolve(null),
  ]);
  const schemaWarning = schemaResult.status === "rejected";
  const schemas = schemaResult.status === "fulfilled" ? schemaResult.value : [];
  const response =
    searchResult.status === "fulfilled" ? searchResult.value : null;
  if (searchResult.status === "rejected") {
    const reason: unknown = searchResult.reason;
    error =
      reason instanceof ApiError && reason.status < 500
        ? reason.message
        : "Arama hizmetine ulaşılamadı. Lütfen yeniden deneyin.";
  }
  const fields = [
    { key: "keyword", label: "Anahtar kelime / başlık ve metin" },
    { key: "title", label: "Belge başlığı" },
    { key: "mimeType", label: "Dosya biçimi (MIME türü)" },
    { key: "filePlanCode", label: "Dosya planı kodu" },
    ...searchableFields(schemas),
  ];
  return (
    <SearchWorkspace
      key={JSON.stringify(params)}
      initialQuery={q}
      initialConditions={conditions}
      initialMode={mode}
      initialFrom={validSearchDate(from) ? from : ""}
      initialTo={validSearchDate(to) ? to : ""}
      initialDateField={dateField}
      fields={fields}
      hasSearch={hasSearch}
    >
      {schemaWarning && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-border bg-muted p-3 text-sm"
        >
          Üstveri alanları yüklenemedi. Başlık ve metin araması kullanılabilir;
          alan listesini almak için sayfayı yenileyin.
        </p>
      )}
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
        >
          {error}
        </p>
      ) : response ? (
        <div className="space-y-5">
          <SearchFacets
            mimeTypes={response.mimeTypes}
            filePlanCodes={response.filePlanCodes}
            active={activeParams}
          />
          {response.hits.length > 0 ? (
            <>
              <SearchResultView hits={response.hits} total={response.total} />
              <SearchPagination
                page={page}
                lastPage={Math.max(
                  1,
                  Math.ceil(Math.min(response.total, 10000) / searchPageSize),
                )}
                params={activeParams}
              />
              {response.total > 10000 && (
                <p className="text-xs text-muted-foreground">
                  İlk 10.000 sonuç gösterilebilir. Daha kesin sonuçlar için
                  filtre ekleyin.
                </p>
              )}
            </>
          ) : (
            <Panel>
              <EmptyState
                icon={SearchX}
                title="Sonuç bulunamadı"
                description="Farklı bir ifade deneyin veya arama koşullarını azaltın."
              />
            </Panel>
          )}

        </div>
      ) : null}
    </SearchWorkspace>
  );
}
