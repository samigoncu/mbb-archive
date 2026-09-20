"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSliders,
  Search,
  X,
  Plus,
  Trash2,
  Lock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Panel } from "@/components/ui/page";
import { cn } from "@/lib/utils";
import {
  metadataFieldTypeLabels as fieldTypeLabels,
  type MetadataSchemaListItem,
  type MetadataSchemaDetail,
} from "@/features/classification/model/classification";
import type { PagedResult } from "@/features/documents/model/document";
import { SchemaRenameDialog } from "./schema-rename";
import { SchemaVersionButton } from "./schema-version-button";
import { SchemaDeleteDialog } from "./schema-delete-dialog";
import { SchemaPublishDialog } from "./schema-publish-dialog";
import { SchemaRevertDialog } from "./schema-revert-dialog";
import { CreateSchemaDialog } from "./create-schema-dialog";
import { AddMetadataFieldDialog } from "./add-metadata-field-dialog";
import { MetadataFieldActions } from "./metadata-field-actions";

type MetadataSchemasWorkspaceProps = {
  schemasResult: PagedResult<MetadataSchemaListItem>;
  selectedSchema: MetadataSchemaDetail | null;
  currentPage: number;
  pageSize: number;
};

type StatusFilter = "all" | "Draft" | "Published";

const statusLabels: Record<string, string> = {
  Draft: "Taslak",
  Published: "Yayımlandı",
  Retired: "Yürürlükten kalktı",
};

export function MetadataSchemasWorkspace({
  schemasResult,
  selectedSchema,
  currentPage,
  pageSize,
}: MetadataSchemasWorkspaceProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const isDraft = selectedSchema?.status === "Draft";

  // Filter schemas based on search query and status filter
  const filteredSchemas = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr-TR");
    return schemasResult.items.filter((item) => {
      const matchesStatus =
        statusFilter === "all" ? true : item.status === statusFilter;
      if (!matchesStatus) return false;

      if (!query) return true;
      const haystack = `${item.name} ${item.key}`.toLocaleLowerCase("tr-TR");
      return haystack.includes(query);
    });
  }, [schemasResult.items, search, statusFilter]);

  const draftCount = useMemo(
    () => schemasResult.items.filter((s) => s.status === "Draft").length,
    [schemasResult.items]
  );
  const publishedCount = useMemo(
    () => schemasResult.items.filter((s) => s.status === "Published").length,
    [schemasResult.items]
  );

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
      {/* Sol Kolon: Şemalar Listesi & Arama & Hızlı İşlemler */}
      <div className="flex min-w-0 flex-col gap-4">
        <Panel
          title="Üstveri Şemaları"
          description={`${schemasResult.totalCount.toLocaleString("tr-TR")} tanımlı şema`}
          actions={
            <CreateSchemaDialog
              onCreated={(newId) => {
                router.push(`/tanimlamalar/ustveri?id=${newId}`);
                router.refresh();
              }}
            />
          }
        >
          {/* Arama ve Filtre Çubuğu */}
          <div className="flex flex-col gap-2.5 border-b border-border p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Şema adı veya anahtarı ara…"
                className="pl-8 pr-8 text-xs h-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Aramayı temizle"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Durum Filtreleme Sekmeleri */}
            <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 font-medium transition-colors text-center",
                  statusFilter === "all"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Tümü ({schemasResult.items.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Draft")}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 font-medium transition-colors text-center",
                  statusFilter === "Draft"
                    ? "bg-background text-amber-700 dark:text-amber-300 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Taslak ({draftCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("Published")}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 font-medium transition-colors text-center",
                  statusFilter === "Published"
                    ? "bg-background text-emerald-700 dark:text-emerald-300 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Yayımlandı ({publishedCount})
              </button>
            </div>
          </div>

          {/* Şema Listesi */}
          {filteredSchemas.length === 0 ? (
            <div className="p-6 text-center">
              <EmptyState
                icon={FileSliders}
                title={search || statusFilter !== "all" ? "Eşleşen şema bulunamadı" : "Henüz şema yok"}
                description={
                  search || statusFilter !== "all"
                    ? "Arama kriterlerini temizleyebilir veya yeni bir şema oluşturabilirsiniz."
                    : "Yukarıdaki 'Yeni Şema' butonuna tıklayarak ilk üstveri şemanızı tanımlayın."
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredSchemas.map((item) => {
                const isSelected = item.id === selectedSchema?.id;
                const isItemDraft = item.status === "Draft";

                return (
                  <li key={item.id} className="group relative">
                    <Link
                      href={`/tanimlamalar/ustveri?id=${item.id}&page=${currentPage}`}
                      aria-current={isSelected ? "page" : undefined}
                      className={cn(
                        "flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        isSelected && "bg-accent/80 hover:bg-accent"
                      )}
                    >
                      <span className="min-w-0 flex-1 pr-2">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {item.name}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-xs text-muted-foreground">
                          {item.key} · v{item.version}
                        </span>
                      </span>

                      <span className="flex shrink-0 flex-col items-end gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            item.status === "Published"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
                          )}
                        >
                          {statusLabels[item.status] ?? item.status}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {item.fieldCount} alan
                        </span>
                      </span>
                    </Link>

                    {/* Taslak Şemalar İçin Liste Üzerinden Hızlı Silme */}
                    {isItemDraft && (
                      <div className="absolute right-2 bottom-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <SchemaDeleteDialog
                          schemaId={item.id}
                          name={item.name}
                          version={item.version}
                          fieldCount={item.fieldCount}
                          trigger={
                            <Button
                              type="button"
                              size="icon-xs"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Taslak şemayı sil"
                              aria-label={`${item.name} taslak şemasını sil`}
                            >
                              <Trash2 className="size-3.5" aria-hidden />
                            </Button>
                          }
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Sayfalama */}
          {schemasResult.totalCount > pageSize && (
            <nav
              aria-label="Şema sayfaları"
              className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-xs"
            >
              <span className="text-muted-foreground tabular-nums">
                {(currentPage - 1) * pageSize + 1}–
                {(currentPage - 1) * pageSize + schemasResult.items.length} /{" "}
                {schemasResult.totalCount}
              </span>
              <span className="flex gap-1">
                {currentPage > 1 && (
                  <Link
                    href={`/tanimlamalar/ustveri?page=${currentPage - 1}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 hover:bg-muted font-medium"
                  >
                    <ChevronLeft className="size-3.5" aria-hidden />
                    Önceki
                  </Link>
                )}
                {currentPage * pageSize < schemasResult.totalCount && (
                  <Link
                    href={`/tanimlamalar/ustveri?page=${currentPage + 1}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 hover:bg-muted font-medium"
                  >
                    Sonraki
                    <ChevronRight className="size-3.5" aria-hidden />
                  </Link>
                )}
              </span>
            </nav>
          )}
        </Panel>
      </div>

      {/* Sağ Kolon: Seçili Şema Detayı & Alan Yönetimi */}
      <div className="min-w-0">
        {!selectedSchema ? (
          <Panel>
            <div className="py-12">
              <EmptyState
                icon={FileSliders}
                title="Üstveri Şeması Seçin"
                description="Soldaki listeden bir şema seçerek alanlarını inceleyebilir veya düzenleyebilirsiniz. Yeni bir üstveri şeması oluşturmak için butona tıklayın."
                action={
                  <CreateSchemaDialog
                    trigger={
                      <Button className="mt-2 gap-1.5 font-medium">
                        <Plus className="size-4" />
                        Yeni Şema Oluştur
                      </Button>
                    }
                  />
                }
              />
            </div>
          </Panel>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Şema Başlık ve İşlem Paneli */}
            <Panel
              title={selectedSchema.name}
              description={`${selectedSchema.key} · Sürüm ${selectedSchema.version} · ${selectedSchema.fields.length} tanımlı alan`}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-2 py-0.5 text-xs font-medium",
                      selectedSchema.status === "Published"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                    )}
                  >
                    {statusLabels[selectedSchema.status] ?? selectedSchema.status}
                  </Badge>

                  <SchemaRenameDialog
                    schemaId={selectedSchema.id}
                    name={selectedSchema.name}
                  />

                  {/* Taslak durumundaysa: Yayımlama ve Silme */}
                  {isDraft && (
                    <>
                      <SchemaPublishDialog
                        schemaId={selectedSchema.id}
                        name={selectedSchema.name}
                        version={selectedSchema.version}
                        fieldCount={selectedSchema.fields.length}
                      />
                      <SchemaDeleteDialog
                        schemaId={selectedSchema.id}
                        name={selectedSchema.name}
                        version={selectedSchema.version}
                        fieldCount={selectedSchema.fields.length}
                      />
                    </>
                  )}

                  {/* Yayımlanmışsa: Taslağa Geri Al, Yeni Sürüm Oluşturma ve Silme */}
                  {!isDraft && (
                    <>
                      <SchemaRevertDialog
                        schemaId={selectedSchema.id}
                        name={selectedSchema.name}
                        version={selectedSchema.version}
                      />
                      <SchemaVersionButton
                        schemaId={selectedSchema.id}
                        nextVersion={selectedSchema.version + 1}
                      />
                      <SchemaDeleteDialog
                        schemaId={selectedSchema.id}
                        name={selectedSchema.name}
                        version={selectedSchema.version}
                        fieldCount={selectedSchema.fields.length}
                      />
                    </>
                  )}
                </div>
              }
            >
              {/* Bilgilendirme Kutusu */}
              {isDraft ? (
                <div className="flex items-start gap-3 border-b border-border bg-amber-50/60 p-4 text-xs leading-5 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
                  <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p>
                    Bu şema henüz <strong>taslak</strong> durumundadır. İstediğiniz alanları ekleyebilir,
                    düzenleyebilir veya şemayı silebilirsiniz. Şemayı belgelerle ilişkilendirip kullanıma
                    açmak için alan tanımlarını tamamladıktan sonra <strong>Şemayı Yayımla</strong> butonunu kullanın.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-3 border-b border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
                  <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <p>
                    Bu şema <strong>yayımlandı</strong> ve arşiv sisteminde kullanımdadır.
                    Geçmiş belgelerin bütünlüğünü bozmadan doğrudan <strong>yeni alan ekleyebilir</strong>,
                    mevcut alanların <strong>etiketlerini ve seçeneklerini düzenleyebilirsiniz</strong>.
                    Henüz hiçbir belgede kullanılmadıysa <strong>Taslağa Geri Al</strong> seçeneğiyle tamamen serbest düzenlemeye dönebilirsiniz.
                  </p>
                </div>
              )}

              {/* Alanlar Tablosu */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Tanımlı Üstveri Alanları</h3>
                    <p className="text-xs text-muted-foreground">
                      Belge yükleme ve tarama aşamalarında doldurulacak alan listesi.
                    </p>
                  </div>
                  <AddMetadataFieldDialog
                    schemaId={selectedSchema.id}
                    schemaName={selectedSchema.name}
                  />
                </div>

                {selectedSchema.fields.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <EmptyState
                      icon={Sparkles}
                      title="Henüz alan tanımlanmadı"
                      description="Belgelerde toplanmasını istediğiniz üstveri alanlarını eklemeye başlayın."
                      action={
                        <AddMetadataFieldDialog
                          schemaId={selectedSchema.id}
                          schemaName={selectedSchema.name}
                          trigger={
                            <Button size="sm" className="mt-2 gap-1.5 font-medium">
                              <Plus className="size-4" />
                              İlk Alanı Ekle
                            </Button>
                          }
                        />
                      }
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full min-w-160 text-left text-sm">
                      <caption className="sr-only">Üstveri alanları</caption>
                      <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Alan Adı & Anahtarı
                          </th>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Veri Türü
                          </th>
                          <th scope="col" className="px-4 py-3 font-semibold">
                            Özellikler
                          </th>
                          <th scope="col" className="px-4 py-3 text-right font-semibold">
                            İşlemler
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedSchema.fields.map((field) => (
                          <tr key={field.id} className="hover:bg-muted/30 transition-colors">
                            <td className="max-w-xs px-4 py-3">
                              <span className="block font-medium text-foreground">{field.label}</span>
                              <span className="block font-mono text-xs text-muted-foreground">
                                {field.key}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                                {fieldTypeLabels[field.fieldType] ?? field.fieldType}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex flex-wrap gap-1.5">
                                {field.isRequired && (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-[11px]"
                                  >
                                    Zorunlu
                                  </Badge>
                                )}
                                {field.isSearchable && (
                                  <Badge
                                    variant="outline"
                                    className="border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 text-[11px]"
                                  >
                                    Aranabilir
                                  </Badge>
                                )}
                                {field.isRepeatable && (
                                  <Badge
                                    variant="outline"
                                    className="border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 text-[11px]"
                                  >
                                    Çok değerli
                                  </Badge>
                                )}
                                {!field.isRequired && !field.isSearchable && !field.isRepeatable && (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <MetadataFieldActions
                                schemaId={selectedSchema.id}
                                field={field}
                                isDraft={isDraft}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

