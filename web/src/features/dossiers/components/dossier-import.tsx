"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { documentUploadAccept } from "@/features/documents/model/office-formats";
import { maxUploadBytes } from "@/features/scanning/model/upload-size";
import { importDossierFile, type ImportResult } from "../api/dossier-import-actions";

export function DossierImport({ id }: { id: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const router = useRouter();
  return <details className="basis-full rounded-lg border p-4">
    <summary className="cursor-pointer font-semibold">Dosya ekle · Tekli / Toplu / ZIP</summary>
    <p className="my-3 text-xs text-muted-foreground">Her dosya ayrı belge olarak bu klasöre kaydedilir. ZIP içindeki alt klasör yolları belge adında korunur; tüm belgeler seçili klasöre açılır. ZIP: en fazla 100 dosya ve açılmış toplam 200 MB. OCR ve dönüştürme arka planda yapılır.</p>
    <form className="space-y-3" onSubmit={async event => {
      event.preventDefault(); if (running || !files.length) return;
      setRunning(true);setError("");setResults([]);setProgress(0);
      try {
        for (let i=0;i<files.length;i++) {
          const data = new FormData();data.set("file",files[i]);
          const next = await importDossierFile(id,data);
          setResults(current=>[...current,...next]);setProgress(i+1);
        }
        setFiles([]); router.refresh();
      } catch { setError("Bağlantı kesildi. Aşağıdaki sonuçları ve klasörü kontrol edin; tamamlanan dosyaları yeniden yüklemeyin."); }
      finally { setRunning(false); }
    }}>
      <label className="block text-sm">Yüklenecek dosyalar
        <input className="mt-2 block w-full rounded border p-2" type="file" multiple accept={`${documentUploadAccept},.zip`} disabled={running} onChange={e=>{
          const next=Array.from(e.target.files??[]);setError("");setResults([]);
          if(next.length>100||next.some(f=>f.size>maxUploadBytes||!f.size)){setFiles([]);setError("En fazla 100 dosya seçin. Her dosya boş olmamalı ve 200 MB sınırını aşmamalıdır.");return;}
          setFiles(next);
        }} />
      </label>
      <Button type="submit" disabled={running||!files.length}>{running?`Aktarılıyor · ${progress}/${files.length}`:`${files.length || ""} dosyayı klasöre yükle`}</Button>
      {error&&<p role="alert" className="text-destructive">{error}</p>}
      {!!results.length&&<ul aria-live="polite" className="max-h-64 space-y-2 overflow-auto">{results.map((r,i)=><li key={i} className="rounded border p-2 text-xs"><strong>{r.name}</strong><p className={r.success?"text-emerald-700":"text-destructive"}>{r.message}</p>{r.documentId&&<Link className="underline" href={`/documents/${r.documentId}`}>Belge kaydını aç</Link>}</li>)}</ul>}
    </form>
  </details>;
}
