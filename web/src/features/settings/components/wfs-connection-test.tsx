"use client";
import { useActionState, useState } from "react";
import { testWfsConnection, searchWfs, importWfs } from "../api/test-wfs";
import { Button } from "@/components/ui/button";
export function WfsConnectionTest({
  layers,
}: {
  layers: { layerName: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(testWfsConnection, "");
  const [layer, setLayer] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<
    { featureId: string; name: string; layerName: string }[]
  >([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <label>
          Katman
          <select
            name="layer"
            value={layer}
            onChange={(e) => {
              setLayer(e.target.value);
              setItems([]);
            }}
            required
            className="ml-2 rounded border p-2"
          >
            <option value="">Katman seçin</option>
            {layers.map((l) => (
              <option key={l.layerName} value={l.layerName}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={pending || !layers.length}>
          {pending ? "Bağlanılıyor…" : "WFS bağlantısını test et"}
        </Button>
        {!layers.length && (
          <p className="text-sm">
            Önce sunucuda en az bir WFS katmanı tanımlayın.
          </p>
        )}
        {state && (
          <p role="status" className="w-full text-sm">
            {state}
          </p>
        )}
      </form>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          try {
            const result = await searchWfs(layer, q);
            setItems(result.items);
            setMessage(
              result.error ??
                `${result.items.length} sonuç (en fazla 25); daha dar bir adla arayabilirsiniz.`,
            );
          } finally {
            setLoading(false);
          }
        }}
        className="flex flex-wrap gap-3"
      >
        <input
          aria-label="WFS nesne adı"
          placeholder="Nesne adını ara"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          required
          className="rounded border p-2"
        />
        <Button disabled={!layer || loading} variant="outline">
          WFS katmanında ara
        </Button>
      </form>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {items.map((item) => (
        <div
          key={item.featureId}
          className="flex items-center justify-between border-b py-2"
        >
          <span>
            {item.name} · {item.featureId}
          </span>
          <Button
            disabled={loading}
            size="sm"
            onClick={async () => {
              setLoading(true);
              try {
                setMessage(await importWfs(item.layerName, item.featureId));
              } finally {
                setLoading(false);
              }
            }}
          >
            Kataloğa al
          </Button>
        </div>
      ))}
    </div>
  );
}
