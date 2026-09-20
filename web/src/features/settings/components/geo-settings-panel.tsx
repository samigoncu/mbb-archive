"use client";

import { useState } from "react";
import { Plus, RefreshCw, Trash2, Power, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteServiceAction,
  discoverLayersAction,
  removeLayerAction,
  saveBasemapAction,
  saveLayerAction,
  saveServiceAction,
  setServiceActiveAction,
  type GeoResult,
  type LayerInput,
  type ServiceInput,
} from "@/features/geo/api/geo-admin-actions";
import {
  geoEntityTypes,
  geoServiceKindLabels,
  type DiscoveredLayer,
  type GeoConfiguration,
  type GeoServiceKind,
  type GeoServiceView,
} from "@/features/geo/model/geo-admin";

const field = "mt-1.5";
const selectClass =
  "mt-1.5 h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const emptyService: ServiceInput = {
  kind: "Wfs", title: "", baseUrl: "", userName: "", password: "", timeoutSeconds: 20,
};

export function GeoSettingsPanel({ initial, canManage }: {
  initial: GeoConfiguration | null;
  canManage: boolean;
}) {
  const [config, setConfig] = useState(initial);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<ServiceInput | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [discovered, setDiscovered] = useState<Record<string, DiscoveredLayer[]>>({});

  if (!config) return <p role="alert">CBS yapılandırması okunamadı. Sayfayı yenileyin.</p>;

  async function run(key: string, work: () => Promise<GeoResult>, success: string) {
    if (pending || !canManage) return;
    setPending(key); setError("");
    try {
      const result = await work();
      if (result.error || !result.data) { setError(result.error ?? "İşlem tamamlanamadı."); return; }
      setConfig(result.data);
      toast.success(success);
    } catch { setError("Sunucuya ulaşılamadı. Sayfayı yenileyip tekrar deneyin."); }
    finally { setPending(""); }
  }

  const basemap = config.basemap;

  return <div className="flex flex-col gap-6">
    <BasemapForm
      key={basemap.version}
      basemap={basemap}
      canManage={canManage}
      disabled={!!pending}
      pending={pending === "basemap"}
      onSave={input => run("basemap", () => saveBasemapAction({ ...input, expectedVersion: basemap.version }),
        "Harita altlığı kaydedildi.")}
    />

    <section aria-label="CBS servisleri" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Servisler</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            WFS öznitelik sorgusu için, WMS haritaya bindirme için kullanılır. Parola şifrelenerek saklanır ve hiçbir yanıtta geri dönmez.
          </p>
        </div>
        {canManage && !draft && <Button type="button" size="sm" onClick={() => { setDraft(emptyService); setEditing(null); }}>
          <Plus className="size-4" aria-hidden />Servis ekle
        </Button>}
      </div>

      {draft && <ServiceForm
        value={draft}
        isNew={!editing}
        disabled={!!pending}
        pending={pending === "service"}
        onCancel={() => { setDraft(null); setEditing(null); }}
        onSave={input => run("service", async () => {
          const result = await saveServiceAction(editing, input);
          if (!result.error) { setDraft(null); setEditing(null); }
          return result;
        }, editing ? "Servis güncellendi." : "Servis eklendi.")}
      />}

      {config.services.length === 0 && !draft && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Henüz CBS servisi tanımlanmadı. Harita ve konum araması servis eklenene kadar kapalı kalır.
      </p>}

      {config.services.map(service => <ServiceCard
        key={service.id}
        service={service}
        canManage={canManage}
        pending={pending}
        discovered={discovered[service.id]}
        onEdit={() => {
          setEditing(service.id);
          // Parola alanı boş başlar; boş bırakılırsa mevcut parola korunur.
          setDraft({ kind: service.kind, title: service.title, baseUrl: service.baseUrl,
            userName: service.userName ?? "", password: null, timeoutSeconds: service.timeoutSeconds });
        }}
        onToggle={() => run(`active-${service.id}`, () => setServiceActiveAction(service.id, !service.isActive),
          service.isActive ? "Servis pasife alındı." : "Servis etkinleştirildi.")}
        onDelete={() => run(`delete-${service.id}`, () => deleteServiceAction(service.id), "Servis silindi.")}
        onDiscover={async () => {
          setPending(`discover-${service.id}`); setError("");
          const result = await discoverLayersAction(service.id);
          setPending("");
          if (result.error) { setError(result.error); return; }
          setDiscovered(current => ({ ...current, [service.id]: result.layers ?? [] }));
          toast.success(`${result.layers?.length ?? 0} katman bulundu.`);
        }}
        onAddLayer={input => run(`layer-${service.id}`, () => saveLayerAction(service.id, null, input), "Katman eklendi.")}
        onUpdateLayer={(layerId, input) => run(`layer-${layerId}`, () => saveLayerAction(service.id, layerId, input), "Katman güncellendi.")}
        onRemoveLayer={layerId => run(`layer-${layerId}`, () => removeLayerAction(service.id, layerId), "Katman kaldırıldı.")}
      />)}
    </section>

    {!canManage && <p className="text-sm">CBS ayarlarını yalnız `geo.manage` yetkisi olan kullanıcı değiştirebilir.</p>}
    {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
  </div>;
}

function BasemapForm({ basemap, canManage, disabled, pending, onSave }: {
  basemap: GeoConfiguration["basemap"];
  canManage: boolean; disabled: boolean; pending: boolean;
  onSave: (input: { tileUrl: string; attribution: string; centerLatitude: number; centerLongitude: number; zoom: number }) => void;
}) {
  const [form, setForm] = useState({
    tileUrl: basemap.tileUrl, attribution: basemap.attribution,
    centerLatitude: String(basemap.centerLatitude), centerLongitude: String(basemap.centerLongitude),
    zoom: String(basemap.zoom),
  });

  return <form className="space-y-4 rounded-xl border border-border bg-card p-4" onSubmit={event => {
    event.preventDefault();
    onSave({
      tileUrl: form.tileUrl, attribution: form.attribution,
      centerLatitude: Number(form.centerLatitude), centerLongitude: Number(form.centerLongitude),
      zoom: Number(form.zoom),
    });
  }}>
    <div>
      <h3 className="text-sm font-semibold">Harita altlığı</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Boş bırakılırsa harita nötr zeminde çizilir ve hiçbir dış servise istek gitmez.
      </p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium sm:col-span-2">Tile adresi
        <Input className={field} value={form.tileUrl} disabled={!canManage}
          placeholder="https://…/{z}/{x}/{y}.png"
          onChange={e => setForm({ ...form, tileUrl: e.target.value })} />
      </label>
      <label className="text-sm font-medium sm:col-span-2">Kaynak gösterimi
        <Input className={field} value={form.attribution} disabled={!canManage}
          onChange={e => setForm({ ...form, attribution: e.target.value })} />
      </label>
      <label className="text-sm font-medium">Merkez enlem
        <Input className={field} type="number" step="any" value={form.centerLatitude} disabled={!canManage}
          onChange={e => setForm({ ...form, centerLatitude: e.target.value })} />
      </label>
      <label className="text-sm font-medium">Merkez boylam
        <Input className={field} type="number" step="any" value={form.centerLongitude} disabled={!canManage}
          onChange={e => setForm({ ...form, centerLongitude: e.target.value })} />
      </label>
      <label className="text-sm font-medium">Açılış yakınlaştırması
        <Input className={field} type="number" min={1} max={22} value={form.zoom} disabled={!canManage}
          onChange={e => setForm({ ...form, zoom: e.target.value })} />
      </label>
    </div>
    {canManage && <Button type="submit" disabled={disabled}>{pending ? "Kaydediliyor…" : "Harita altlığını kaydet"}</Button>}
    {basemap.updatedAt && <p className="text-xs text-muted-foreground">Son değişiklik: {basemap.updatedBy} · {new Date(basemap.updatedAt).toLocaleString("tr-TR")}</p>}
  </form>;
}

function ServiceForm({ value, isNew, disabled, pending, onCancel, onSave }: {
  value: ServiceInput; isNew: boolean; disabled: boolean; pending: boolean;
  onCancel: () => void; onSave: (input: ServiceInput) => void;
}) {
  const [form, setForm] = useState(value);

  return <form className="space-y-4 rounded-xl border border-primary/30 bg-card p-4" onSubmit={event => {
    event.preventDefault();
    onSave(form);
  }}>
    <h4 className="text-sm font-semibold">{isNew ? "Yeni servis" : "Servisi düzenle"}</h4>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Tür
        <select className={selectClass} value={form.kind} disabled={!isNew}
          onChange={e => setForm({ ...form, kind: e.target.value as GeoServiceKind })}>
          {Object.entries(geoServiceKindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        {!isNew && <span className="mt-1.5 block text-xs font-normal text-muted-foreground">Tür sonradan değiştirilemez.</span>}
      </label>
      <label className="text-sm font-medium">Servis adı
        <Input className={field} required maxLength={300} value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })} />
      </label>
      <label className="text-sm font-medium sm:col-span-2">Servis adresi
        <Input className={field} required type="url" maxLength={1000} value={form.baseUrl}
          placeholder="https://cbs.kurum.gov.tr/geoserver/ows"
          onChange={e => setForm({ ...form, baseUrl: e.target.value })} />
      </label>
      <label className="text-sm font-medium">Kullanıcı adı (varsa)
        <Input className={field} maxLength={300} value={form.userName}
          onChange={e => setForm({ ...form, userName: e.target.value })} />
      </label>
      <label className="text-sm font-medium">Parola
        <Input className={field} type="password" autoComplete="new-password"
          value={form.password ?? ""}
          onChange={e => setForm({ ...form, password: e.target.value })} />
        <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
          {isNew ? "Şifrelenerek saklanır." : "Boş bırakılırsa mevcut parola korunur."}
        </span>
      </label>
      <label className="text-sm font-medium">Zaman aşımı (saniye)
        <Input className={field} type="number" min={1} max={300} value={form.timeoutSeconds}
          onChange={e => setForm({ ...form, timeoutSeconds: Number(e.target.value) })} />
      </label>
    </div>
    <div className="flex gap-2">
      <Button type="submit" disabled={disabled}>{pending ? "Kaydediliyor…" : "Kaydet"}</Button>
      <Button type="button" variant="outline" onClick={onCancel}>Vazgeç</Button>
    </div>
  </form>;
}

function ServiceCard({ service, canManage, pending, discovered, onEdit, onToggle, onDelete, onDiscover, onAddLayer, onUpdateLayer, onRemoveLayer }: {
  service: GeoServiceView; canManage: boolean; pending: string;
  discovered?: DiscoveredLayer[];
  onEdit: () => void; onToggle: () => void; onDelete: () => void; onDiscover: () => void;
  onAddLayer: (input: LayerInput) => void;
  onUpdateLayer: (layerId: string, input: LayerInput) => void;
  onRemoveLayer: (layerId: string) => void;
}) {
  const isWms = service.kind === "Wms";

  return <article className="space-y-4 rounded-xl border border-border bg-card p-4">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold">{service.title}</h4>
          <span className="rounded-full border border-border px-2 py-0.5 text-2xs uppercase tracking-wider text-muted-foreground">{service.kind}</span>
          {!service.isActive && <span className="rounded-full border border-border px-2 py-0.5 text-2xs text-muted-foreground">Pasif</span>}
        </div>
        <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{service.baseUrl}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {service.userName ? `Kimlik: ${service.userName}` : "Kimliksiz erişim"}
          {service.hasPassword ? " · parola tanımlı" : ""} · {service.timeoutSeconds} sn
        </p>
      </div>
      {canManage && <div className="flex shrink-0 gap-1">
        <Button type="button" size="sm" variant="outline" disabled={!!pending} onClick={onDiscover}>
          <Search className="size-4" aria-hidden />
          {pending === `discover-${service.id}` ? "Sorgulanıyor…" : "Katmanları keşfet"}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!!pending} onClick={onEdit}>Düzenle</Button>
        <Button type="button" size="icon-sm" variant="ghost" disabled={!!pending} onClick={onToggle}
          aria-label={service.isActive ? `${service.title} pasife al` : `${service.title} etkinleştir`}>
          <Power className="size-4" aria-hidden />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" disabled={!!pending} onClick={onDelete}
          aria-label={`${service.title} servisini sil`}>
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>}
    </header>

    {discovered && <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium">Sunucudaki katmanlar ({discovered.length})</p>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
        {discovered.map(layer => <li key={layer.layerName} className="flex items-center justify-between gap-3 text-xs">
          <span className="min-w-0">
            <span className="block truncate font-medium">{layer.title}</span>
            <span className="block truncate font-mono text-muted-foreground">{layer.layerName}</span>
          </span>
          {layer.alreadyAdded
            ? <span className="shrink-0 text-muted-foreground">eklendi</span>
            : <Button type="button" size="xs" variant="outline" disabled={!!pending}
                onClick={() => onAddLayer({
                  layerName: layer.layerName, title: layer.title,
                  entityType: "CustomGeometry", nameAttribute: "name",
                  visibleByDefault: false, opacityPercent: 100,
                  imageFormat: isWms ? "image/png" : null,
                  isQueryable: layer.isQueryable,
                })}>
                <Plus className="size-3" aria-hidden />Ekle
              </Button>}
        </li>)}
        {discovered.length === 0 && <li className="text-xs text-muted-foreground">Sunucu katman bildirmedi.</li>}
      </ul>
    </div>}

    <div>
      <p className="text-xs font-medium">Eklenen katmanlar ({service.layers.length})</p>
      {service.layers.length === 0
        ? <p className="mt-2 text-xs text-muted-foreground">Katman eklenmedi. "Katmanları keşfet" ile sunucudaki listeyi çekebilirsiniz.</p>
        : <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {service.layers.map(layer => <li key={layer.id} className="flex flex-wrap items-center gap-3 p-3 text-xs">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{layer.title}</span>
                <span className="block truncate font-mono text-muted-foreground">{layer.layerName}</span>
              </span>
              {isWms ? <>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={layer.visibleByDefault} disabled={!canManage || !!pending}
                    onChange={e => onUpdateLayer(layer.id, { ...toInput(layer), visibleByDefault: e.target.checked })} />
                  açılışta görünür
                </label>
                <label className="flex items-center gap-1.5">saydamlık
                  <Input className="h-7 w-16" type="number" min={10} max={100} defaultValue={layer.opacityPercent}
                    disabled={!canManage || !!pending}
                    onBlur={e => {
                      const value = Number(e.target.value);
                      if (value !== layer.opacityPercent) onUpdateLayer(layer.id, { ...toInput(layer), opacityPercent: value });
                    }} />
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={layer.isQueryable} disabled={!canManage || !!pending}
                    onChange={e => onUpdateLayer(layer.id, { ...toInput(layer), isQueryable: e.target.checked })} />
                  tıklanınca sorgula
                </label>
              </> : <>
                <label className="flex items-center gap-1.5">varlık türü
                  <select className="h-7 rounded border border-input bg-transparent px-1" value={layer.entityType}
                    disabled={!canManage || !!pending}
                    onChange={e => onUpdateLayer(layer.id, { ...toInput(layer), entityType: e.target.value })}>
                    {geoEntityTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-1.5">ad özniteliği
                  <Input className="h-7 w-28" defaultValue={layer.nameAttribute} disabled={!canManage || !!pending}
                    onBlur={e => {
                      if (e.target.value !== layer.nameAttribute) onUpdateLayer(layer.id, { ...toInput(layer), nameAttribute: e.target.value });
                    }} />
                </label>
              </>}
              {canManage && <Button type="button" size="icon-xs" variant="ghost" disabled={!!pending}
                onClick={() => onRemoveLayer(layer.id)} aria-label={`${layer.title} katmanını kaldır`}>
                <Trash2 className="size-3" aria-hidden />
              </Button>}
            </li>)}
          </ul>}
    </div>
  </article>;
}

function toInput(layer: GeoServiceView["layers"][number]): LayerInput {
  return {
    layerName: layer.layerName, title: layer.title, entityType: layer.entityType,
    nameAttribute: layer.nameAttribute, visibleByDefault: layer.visibleByDefault,
    opacityPercent: layer.opacityPercent, imageFormat: layer.imageFormat, isQueryable: layer.isQueryable,
  };
}
