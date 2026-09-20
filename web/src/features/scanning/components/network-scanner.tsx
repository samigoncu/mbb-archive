"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/page";
type Device = { model: string; sources: string[]; formats: string[] };
const bridge = "http://127.0.0.1:17891";
export function NetworkScanner({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled: boolean;
}) {
  const [token, setToken] = useState("");
  const [device, setDevice] = useState<Device | null>(null);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const stop = useRef(false);
  async function request(path: string, method = "GET", body?: object) {
    const response = await fetch(bridge + path, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) {
      const problem = await response
        .json()
        .catch(() => ({ detail: "Tarama köprüsü yanıt vermedi." }));
      throw new Error(problem.detail);
    }
    return response;
  }
  async function connect() {
    setBusy(true);
    setMessage("");
    setDevice(null);
    try {
      const info = (await (await request("/device")).json()) as Device;
      setDevice(info);
      setSource(info.sources[0] ?? "");
      setMessage(`${info.model} bağlantısı doğrulandı.`);
    } catch (e) {
      setMessage(
        e instanceof TypeError
          ? "Yerel köprüye erişilemiyor. Köprüyü başlatın; tarayıcının yerel ağ iznini kontrol edin."
          : e instanceof Error
            ? e.message
            : "Bağlantı kurulamadı.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function scan() {
    setBusy(true);
    stop.current = false;
    let id: string | null = null;
    let count = 0;
    try {
      const job = (await (
        await request("/jobs", "POST", { source })
      ).json()) as { id: string };
      id = job.id;
      while (!stop.current) {
        setMessage(`${count} dosya alındı; cihaz bekleniyor…`);
        const response = await request(`/jobs/${id}`, "POST");
        if (response.status === 204) break;
        const blob = await response.blob();
        const extension =
          blob.type === "application/pdf"
            ? "pdf"
            : blob.type === "image/png"
              ? "png"
              : "jpg";
        onFiles([
          new File([blob], `tarama-${id.slice(0, 8)}-${++count}.${extension}`, {
            type: blob.type,
          }),
        ]);
        if (source === "Platen") break;
      }
      setMessage(
        `${count} dosya indeksleme alanına alındı${stop.current ? "; tarama durduruldu" : ""}. Künye bilgilerini tamamlayıp Arşive Aktar ile kaydedin.`,
      );
    } catch (e) {
      setMessage(
        `${count} dosya alındı. ${e instanceof Error ? e.message : "Tarama tamamlanamadı."} Alınan sayfalar önizlemede korunuyor.`,
      );
    } finally {
      if (id) await request(`/jobs/${id}`, "DELETE").catch(() => undefined);
      setBusy(false);
    }
  }
  return (
    <section id="ag-tarayicisi">
      <Panel title="Ağ Tarayıcısından Al" padded>
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            eSCL / AirScan destekli ağ cihazını bağlayın. Tarama dosyası seçme
            veya tekrar yükleme gerekmeden sayfalar aşağıdaki indeksleme alanına
            gelir.
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer text-primary">
              İlk bağlantı nasıl yapılır?
            </summary>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>
                Cihazda eSCL / AirScan taramayı açın. Yalnız yazdırma
                destekleyen cihazlar tarama yapamaz.
              </li>
              <li>
                Bu bilgisayarda proje klasöründen Python 3 ile{" "}
                <code>src/Agents/Mbb.Archive.ScanAgent/escl_agent.py</code>{" "}
                çalıştırın. Önce <code>SCAN_DEVICE_URL</code> değişkenine
                cihazın eSCL adresini verin (IP/port ve eSCL yolu üreticiye göre
                değişir).
              </li>
              <li>
                Köprünün terminalde gösterdiği anahtarı aşağıya girin. Web
                adresi localhost:3000 değilse köprüde{" "}
                <code>SCAN_APP_ORIGIN</code> değerini web adresinize ayarlayın.
              </li>
              <li>
                Cihazı Bağla düğmesine basın; cihazın bildirdiği besleme
                kaynağını seçip tarayın. Köprü yalnız bu bilgisayarda dinler;
                anahtar tarayıcı depolamasına kaydedilmez.
              </li>
            </ol>
            <p className="mt-2">
              TWAIN/WIA veya WSD ile sınırlı cihazlar için ayrı sürücü adaptörü
              gerekir; bu köprü eSCL içindir.
            </p>
          </details>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              Köprü anahtarı
              <Input
                type="password"
                autoComplete="off"
                value={token}
                disabled={busy}
                onChange={(e) => {
                  setToken(e.target.value);
                  setDevice(null);
                }}
              />
            </label>
            <Button
              variant="outline"
              disabled={busy || disabled || token.length < 32}
              onClick={connect}
            >
              Cihazı Bağla
            </Button>
            {device && (
              <>
                <label>
                  Kaynak
                  <select
                    value={source}
                    disabled={busy}
                    onChange={(e) => setSource(e.target.value)}
                    className="ml-2 rounded border p-2"
                  >
                    {device.sources.map((s) => (
                      <option key={s} value={s}>
                        {s === "Platen"
                          ? "Cam yüzey"
                          : "Otomatik besleyici (ADF)"}
                      </option>
                    ))}
                  </select>
                </label>
                <Button disabled={busy || disabled || !source} onClick={scan}>
                  Tara ve indekslemeye al
                </Button>
              </>
            )}
            {busy && (
              <Button
                variant="outline"
                onClick={() => {
                  stop.current = true;
                  setMessage("Mevcut sayfa alındıktan sonra durdurulacak.");
                }}
              >
                Durdur
              </Button>
            )}
          </div>
          {message && (
            <p role="status" className="text-sm">
              {message}
            </p>
          )}
        </div>
      </Panel>
    </section>
  );
}
