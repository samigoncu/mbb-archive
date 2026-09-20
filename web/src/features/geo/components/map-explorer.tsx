"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Layers, Loader2, MapPin, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState, Notice, Panel } from "@/components/ui/page";
import { GeoMap, type GeoMapFeature } from "@/features/geo/components/geo-map";
import {
  geoEntityTypeLabels,
  geoRelationTypeLabels,
  type GeoEntitySummary,
  type GeoMapSettings,
  type GeoRelatedDocument,
} from "@/features/geo/model/geo";

/**
 * §18 harita ekranı: solda katalog, ortada harita, sağda seçilen nesneye bağlı
 * kurumsal kayıtlar. Harita dekoratif değildir; seçim iki yönlü gezinmenin
 * girişidir.
 */
export function MapExplorer({
  settings,
  entities,
  geometries,
  wmsLayers = [],
}: {
  settings: GeoMapSettings;
  entities: GeoEntitySummary[];
  geometries: GeoMapFeature[];
  wmsLayers?: import("@/features/geo/model/geo-admin").WmsMapLayer[];
}) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    entities[0]?.id ?? null,
  );
  const [documents, setDocuments] = useState<GeoRelatedDocument[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr");

    return query
      ? entities.filter((entity) =>
          entity.name.toLocaleLowerCase("tr").includes(query),
        )
      : entities;
  }, [entities, search]);

  const visibleGeometries = useMemo(() => {
    const allowed = new Set(filtered.map((entity) => entity.id));
    return geometries.filter((geometry) => allowed.has(geometry.id));
  }, [filtered, geometries]);

  const selected = entities.find((entity) => entity.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) {
      setDocuments(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/geo/entities/${encodeURIComponent(selectedId)}/documents`, {
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data: GeoRelatedDocument[]) => {
        if (!cancelled) setDocuments(data);
      })
      .catch(() => {
        if (!cancelled) setDocuments([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <Link
        href="/ayarlar#cbs"
        className="text-sm text-primary underline lg:col-span-12"
      >
        CBS / WFS bağlantısını yapılandır ve test et
      </Link>
      <div className="flex flex-col gap-3 lg:col-span-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Yol, mahalle, parsel ara…"
            className="h-9 pl-8"
            aria-label="Coğrafi nesne ara"
          />
        </div>

        <Panel
          title="Katalog"
          description={`${filtered.length} nesne`}
          className="max-h-[560px] overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <EmptyState icon={Layers} title="Eşleşen nesne yok" />
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((entity) => (
                <li key={entity.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(entity.id)}
                    aria-current={entity.id === selectedId}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-muted ${
                      entity.id === selectedId ? "bg-muted" : ""
                    }`}
                  >
                    <span className="text-sm font-medium">{entity.name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {geoEntityTypeLabels[entity.entityType] ??
                        entity.entityType}
                      {entity.relatedDocumentCount > 0
                        ? ` · ${entity.relatedDocumentCount} kayıt`
                        : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="lg:col-span-6">
        <Panel>
          <GeoMap
            settings={settings}
            features={visibleGeometries}
            wmsLayers={wmsLayers}
            selectedId={selectedId}
            onSelect={setSelectedId}
            className="h-[560px] w-full bg-muted/30"
          />
        </Panel>
      </div>

      <div className="flex flex-col gap-3 lg:col-span-3">
        {selected ? (
          <Panel
            title={selected.name}
            description={
              geoEntityTypeLabels[selected.entityType] ?? selected.entityType
            }
          >
            <dl className="flex flex-col gap-1.5 px-4 py-3 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Katman</dt>
                <dd className="font-mono">{selected.layerName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Feature</dt>
                <dd className="truncate font-mono">{selected.featureId}</dd>
              </div>
              {selected.externalReference ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Dış referans</dt>
                  <dd className="truncate font-mono">
                    {selected.externalReference}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Panel>
        ) : null}

        <Panel
          title="İlişkili kurumsal kayıtlar"
          description={selected ? undefined : "Haritadan bir nesne seçin"}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Yükleniyor…
            </div>
          ) : documents === null ? (
            <EmptyState icon={MapPin} title="Nesne seçilmedi" />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Bu nesneye bağlı kayıt yok"
              description="Belge görüntüleyicinin Harita sekmesinden ilişki kurabilirsiniz."
            />
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((document) => (
                <li key={document.relationId} className="px-4 py-2.5">
                  <Link
                    href={`/documents/${document.documentId}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {document.documentId.slice(0, 8)}…
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">
                      {geoRelationTypeLabels[document.relationType] ??
                        document.relationType}
                    </Badge>
                    {document.isActive ? null : (
                      <Badge variant="outline">kapalı</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {settings.isProviderConfigured ? null : (
          <Notice tone="warning">
            Kurumsal CBS (WFS) servisi yapılandırılmamış. Katalogdaki nesneler
            yalnızca yerel olarak tanımlananlardır.
          </Notice>
        )}

        {settings.isBasemapConfigured ? null : (
          <Notice>
            Harita altlığı tanımlı değil; geometriler zeminsiz çiziliyor.
            <code className="ml-1 font-mono text-[11px]">
              Geo:Basemap:TileUrl
            </code>{" "}
            ayarlanarak kurumun kendi servisi bağlanabilir.
          </Notice>
        )}
      </div>
    </div>
  );
}
